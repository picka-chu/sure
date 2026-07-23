# Surepay Python SDK

Verify Ethiopian bank transfer receipts programmatically.

## Installation

```bash
pip install surepay
```

## Quick Start

```python
from surepay import Surepay

client = Surepay(api_key="sk-your-api-key-here")

# Verify a receipt image
result = client.verify("receipt.jpg", bank_name="cbe")
print(f"Verified: {result.is_verified}")
print(f"Reason: {result.reason}")
print(f"Payer: {result.payer_name} ({result.payer_account})")
print(f"Receiver: {result.receiver_name} ({result.receiver_account})")
print(f"Amount: {result.amount} {result.currency}")

# Verify by reference (no image needed)
result = client.verify_link(bank_name="cbe", reference="FT25211G11JQ")

# Check a previous verification
result = client.get_verification("uuid-here")

# List your verifications
results = client.list_verifications(limit=50)
for v in results.verifications:
    print(f"{v.id}: {v.status} — {v.amount} ETB")

# Manage API keys
key = client.create_api_key(name="My App")
print(f"New key: {key.key}")  # show once, store safely

keys = client.list_api_keys()
client.revoke_api_key(key.id)
```

## API

| Method | Description |
|--------|-------------|
| `verify(file, bank_name?, reference?)` | Upload receipt image for verification |
| `verify_link(bank_name, reference)` | Verify by bank + reference (no image) |
| `get_verification(id)` | Get a verification result |
| `list_verifications(limit, offset)` | List all verifications |
| `create_api_key(name)` | Generate a new API key |
| `list_api_keys()` | List all API keys |
| `revoke_api_key(id)` | Deactivate an API key |

## Authentication

Pass your API key to the constructor. Get one from the Surepay dashboard under **Developer > API Keys**.

```python
client = Surepay(api_key="sk-...")
```

## Error Handling

```python
from surepay import Surepay, SurepayError

client = Surepay(api_key="sk-...")
try:
    result = client.verify("receipt.jpg")
except SurepayError as e:
    print(f"Error {e.status_code}: {e}")
```
