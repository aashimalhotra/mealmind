#!/usr/bin/env python3
"""Test script to verify the chat SSE endpoint"""
import requests
import json

url = "http://localhost:8400/api/chat/"
data = {"message": "Hello, can you help me plan a meal?"}

print(f"Sending request to {url}")
print(f"Data: {data}")

response = requests.post(url, json=data, stream=True)

print(f"\nStatus Code: {response.status_code}")
print(f"Headers: {dict(response.headers)}\n")

if response.status_code == 200:
    print("Streaming response:")
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            print(f"  {line_str}")
            # Parse SSE data
            if line_str.startswith('data: '):
                data_str = line_str[6:]  # Remove 'data: ' prefix
                try:
                    data_json = json.loads(data_str)
                    if 'done' in data_json:
                        print("\nStream complete!")
                        break
                except json.JSONDecodeError:
                    pass
else:
    print(f"Error: {response.text}")
