"""
Test suite for Chat System and Admin Control Panel features
- Chat: send messages, get messages, get channels, mark as read
- Admin: API key management, API logs, lead sources, distribution rules
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "shumail.s"
TEST_PASSWORD = "HONDA@2026"


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for superadmin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestChatSystem(TestAuth):
    """Chat system endpoint tests"""
    
    def test_get_chat_channels(self, auth_headers):
        """GET /api/chat/channels returns channel list with All Team"""
        response = requests.get(f"{BASE_URL}/api/chat/channels", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        channels = response.json()
        assert isinstance(channels, list), "Channels should be a list"
        
        # Should have at least 'all-team' channel
        channel_ids = [ch["id"] for ch in channels]
        assert "all-team" in channel_ids, "All Team channel should exist"
        
        # Verify channel structure
        all_team = next(ch for ch in channels if ch["id"] == "all-team")
        assert all_team["name"] == "All Team"
        assert all_team["type"] == "group"
        assert "unread" in all_team
        print(f"SUCCESS: Found {len(channels)} channels including All Team")
    
    def test_send_chat_message_all_team(self, auth_headers):
        """POST /api/chat/send sends message to all-team channel"""
        test_message = f"Test message from pytest at {time.time()}"
        
        response = requests.post(f"{BASE_URL}/api/chat/send", 
            headers=auth_headers,
            json={
                "channel": "all-team",
                "text": test_message,
                "receiver_id": None
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["text"] == test_message
        assert data["channel"] == "all-team"
        assert "id" in data
        assert "sender_id" in data
        assert "sender_name" in data
        assert "created_at" in data
        print(f"SUCCESS: Message sent with ID {data['id']}")
        return data["id"]
    
    def test_get_chat_messages(self, auth_headers):
        """GET /api/chat/messages returns messages for channel"""
        response = requests.get(f"{BASE_URL}/api/chat/messages", 
            headers=auth_headers,
            params={"channel": "all-team", "limit": 50}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        messages = response.json()
        assert isinstance(messages, list), "Messages should be a list"
        
        # Verify message structure if any exist
        if messages:
            msg = messages[-1]  # Most recent
            assert "id" in msg
            assert "text" in msg
            assert "sender_name" in msg
            assert "channel" in msg
            print(f"SUCCESS: Retrieved {len(messages)} messages from all-team")
        else:
            print("SUCCESS: No messages yet in all-team channel")
    
    def test_mark_chat_read(self, auth_headers):
        """POST /api/chat/read marks messages as read"""
        response = requests.post(f"{BASE_URL}/api/chat/read",
            headers=auth_headers,
            params={"channel": "all-team"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Marked as read"
        print("SUCCESS: Messages marked as read")
    
    def test_chat_message_flow(self, auth_headers):
        """Full flow: send message -> verify in messages list"""
        unique_text = f"Flow test message {time.time()}"
        
        # Send message
        send_response = requests.post(f"{BASE_URL}/api/chat/send",
            headers=auth_headers,
            json={"channel": "all-team", "text": unique_text, "receiver_id": None}
        )
        assert send_response.status_code == 200
        sent_msg = send_response.json()
        
        # Retrieve messages and verify
        get_response = requests.get(f"{BASE_URL}/api/chat/messages",
            headers=auth_headers,
            params={"channel": "all-team", "limit": 10}
        )
        assert get_response.status_code == 200
        messages = get_response.json()
        
        # Find our message
        found = any(m["id"] == sent_msg["id"] for m in messages)
        assert found, "Sent message should appear in messages list"
        print("SUCCESS: Chat message flow verified (send -> retrieve)")


class TestAdminApiKeys(TestAuth):
    """Admin API Key management tests"""
    
    def test_get_vendor_api_key(self, auth_headers):
        """GET /api/leads/api-key returns vendor API key (superadmin only)"""
        response = requests.get(f"{BASE_URL}/api/leads/api-key", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "api_key" in data
        assert data["api_key"].startswith("brw-"), "API key should start with 'brw-'"
        print(f"SUCCESS: Retrieved API key: {data['api_key'][:10]}...")
    
    def test_get_vendor_api_key_unauthorized(self):
        """GET /api/leads/api-key without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/leads/api-key")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Unauthorized access blocked")
    
    def test_regenerate_api_key(self, auth_headers):
        """POST /api/leads/api-key/regenerate creates new key"""
        # Get current key
        old_response = requests.get(f"{BASE_URL}/api/leads/api-key", headers=auth_headers)
        old_key = old_response.json()["api_key"]
        
        # Regenerate
        regen_response = requests.post(f"{BASE_URL}/api/leads/api-key/regenerate", headers=auth_headers)
        assert regen_response.status_code == 200, f"Failed: {regen_response.text}"
        
        new_key = regen_response.json()["api_key"]
        assert new_key.startswith("brw-")
        assert new_key != old_key, "New key should be different from old key"
        print(f"SUCCESS: API key regenerated: {new_key[:10]}...")


class TestAdminApiLogs(TestAuth):
    """Admin API Logs tests"""
    
    def test_get_api_logs(self, auth_headers):
        """GET /api/admin/api-logs returns logs list"""
        response = requests.get(f"{BASE_URL}/api/admin/api-logs",
            headers=auth_headers,
            params={"limit": 50}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert isinstance(data["logs"], list)
        assert isinstance(data["total"], int)
        
        # Verify log structure if any exist
        if data["logs"]:
            log = data["logs"][0]
            assert "type" in log
            assert "timestamp" in log
            print(f"SUCCESS: Retrieved {len(data['logs'])} logs (total: {data['total']})")
        else:
            print("SUCCESS: No API logs yet")
    
    def test_get_api_logs_unauthorized(self):
        """GET /api/admin/api-logs without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/admin/api-logs")
        assert response.status_code in [401, 403]
        print("SUCCESS: Unauthorized access to API logs blocked")


class TestAdminLeadSources(TestAuth):
    """Admin Lead Sources tests"""
    
    def test_get_lead_sources(self, auth_headers):
        """GET /api/admin/lead-sources returns sources with counts"""
        response = requests.get(f"{BASE_URL}/api/admin/lead-sources", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        sources = response.json()
        assert isinstance(sources, list)
        
        # Verify structure if any exist
        if sources:
            src = sources[0]
            assert "name" in src
            assert "count" in src
            assert isinstance(src["count"], int)
            print(f"SUCCESS: Found {len(sources)} lead sources")
            for s in sources[:5]:
                print(f"  - {s['name']}: {s['count']} leads")
        else:
            print("SUCCESS: No lead sources tracked yet")
    
    def test_get_lead_sources_unauthorized(self):
        """GET /api/admin/lead-sources without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/admin/lead-sources")
        assert response.status_code in [401, 403]
        print("SUCCESS: Unauthorized access to lead sources blocked")


class TestAdminDistribution(TestAuth):
    """Admin Lead Distribution Rules tests"""
    
    def test_get_distribution_rules(self, auth_headers):
        """GET /api/admin/distribution returns rules list"""
        response = requests.get(f"{BASE_URL}/api/admin/distribution", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        rules = response.json()
        assert isinstance(rules, list)
        
        # Verify structure if any exist
        if rules:
            rule = rules[0]
            assert "agent_name" in rule
            assert "source" in rule
            assert "weight" in rule
            assert "enabled" in rule
            print(f"SUCCESS: Found {len(rules)} distribution rules")
        else:
            print("SUCCESS: No distribution rules configured yet")
    
    def test_create_distribution_rule(self, auth_headers):
        """POST /api/admin/distribution creates/updates rule"""
        response = requests.post(f"{BASE_URL}/api/admin/distribution",
            headers=auth_headers,
            params={
                "agent_name": "TEST_Agent",
                "source": "TEST_Source",
                "weight": 5,
                "enabled": True
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Rule saved"
        print("SUCCESS: Distribution rule created")
        
        # Verify it exists
        get_response = requests.get(f"{BASE_URL}/api/admin/distribution", headers=auth_headers)
        rules = get_response.json()
        found = any(r["agent_name"] == "TEST_Agent" and r["source"] == "TEST_Source" for r in rules)
        assert found, "Created rule should appear in rules list"
        print("SUCCESS: Rule verified in list")
    
    def test_update_distribution_rule(self, auth_headers):
        """POST /api/admin/distribution updates existing rule"""
        # Update the test rule
        response = requests.post(f"{BASE_URL}/api/admin/distribution",
            headers=auth_headers,
            params={
                "agent_name": "TEST_Agent",
                "source": "TEST_Source",
                "weight": 10,  # Changed weight
                "enabled": False  # Changed enabled
            }
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/admin/distribution", headers=auth_headers)
        rules = get_response.json()
        rule = next((r for r in rules if r["agent_name"] == "TEST_Agent" and r["source"] == "TEST_Source"), None)
        assert rule is not None
        assert rule["weight"] == 10
        assert rule["enabled"] == False
        print("SUCCESS: Distribution rule updated")
    
    def test_delete_distribution_rule(self, auth_headers):
        """DELETE /api/admin/distribution deletes rule"""
        response = requests.delete(f"{BASE_URL}/api/admin/distribution",
            headers=auth_headers,
            params={
                "agent_name": "TEST_Agent",
                "source": "TEST_Source"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Rule deleted"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/distribution", headers=auth_headers)
        rules = get_response.json()
        found = any(r["agent_name"] == "TEST_Agent" and r["source"] == "TEST_Source" for r in rules)
        assert not found, "Deleted rule should not appear in rules list"
        print("SUCCESS: Distribution rule deleted")
    
    def test_distribution_unauthorized(self):
        """Distribution endpoints without auth return 401/403"""
        # GET
        response = requests.get(f"{BASE_URL}/api/admin/distribution")
        assert response.status_code in [401, 403]
        
        # POST
        response = requests.post(f"{BASE_URL}/api/admin/distribution",
            params={"agent_name": "Test", "source": "Test", "weight": 1, "enabled": True}
        )
        assert response.status_code in [401, 403]
        
        # DELETE
        response = requests.delete(f"{BASE_URL}/api/admin/distribution",
            params={"agent_name": "Test", "source": "Test"}
        )
        assert response.status_code in [401, 403]
        print("SUCCESS: All distribution endpoints require auth")


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_rules(self, auth_headers):
        """Clean up any remaining test distribution rules"""
        # Get all rules
        response = requests.get(f"{BASE_URL}/api/admin/distribution", headers=auth_headers)
        if response.status_code == 200:
            rules = response.json()
            for rule in rules:
                if rule["agent_name"].startswith("TEST_") or rule["source"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/distribution",
                        headers=auth_headers,
                        params={"agent_name": rule["agent_name"], "source": rule["source"]}
                    )
        print("SUCCESS: Test data cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
