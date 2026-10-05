import json
import os
import urllib.request


base_url = os.environ.get("QR_TOOLS_API_URL", "https://api.thangdc.com").rstrip("/")
api_key = os.environ["QR_TOOLS_API_KEY"]
payload = os.environ["QR_PAYLOAD"]

request = urllib.request.Request(
    f"{base_url}/v1/scan",
    data=json.dumps({"payload": payload}).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },
    method="POST",
)

with urllib.request.urlopen(request, timeout=15) as response:
    print(response.read().decode("utf-8"))
