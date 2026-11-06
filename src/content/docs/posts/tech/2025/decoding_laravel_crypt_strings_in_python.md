---
title: "Replicating Laravel's Crypt::decryptString Logic in Python"
description: "A technical deep dive into decoding Laravel encrypted strings using Python's 'pycryptodome' library. Learn the AES-256-CBC, HMAC-SHA256 protocol used by Laravel and how to successfully verify the MAC and decrypt the payload outside the PHP environment."
tags: ["Laravel", "Cryptography", "Python", "AES-256-CBC", "HMAC-SHA256", "pycryptodome"]
pubDate: "2025-10-17T19:17:25.000Z"
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3267094508_short_ruler_in_the_grass.png"
---

## Decoding Laravel Encrypted Strings: A Deep Dive with Python 🐍

Laravel, a popular PHP web framework, uses a robust mechanism for encrypting data, primarily via the `Crypt` facade and functions like `encryptString()`. This encryption is essential for securely storing sensitive data in databases or passing it across channels. If you ever need to **decouple** a Laravel application from its data—perhaps for migration, auditing, or integration with a non-PHP service—you'll need to replicate its decryption logic.

This article dissects the Python code provided, explaining the cryptographic process Laravel employs and how to successfully decrypt its strings outside the PHP ecosystem, using **Python's `pycryptodome`** library and standard modules.

-----

## Understanding Laravel's Encryption Protocol

Laravel's encryption is built upon a standard, secure protocol. Knowing the components is crucial for successful decryption:

| Component | Description |
| :--- | :--- |
| **Algorithm** | **AES-256-CBC** (Advanced Encryption Standard with Cipher Block Chaining). |
| **Key Size** | **256 bits** (32 bytes), derived from the `APP_KEY` in the `.env` file. |
| **Initialization Vector (IV)** | A **16-byte** random string, ensuring identical plaintext encrypts to different ciphertext each time. |
| **Message Authentication Code (MAC)** | A **HMAC-SHA256** hash used for integrity and authenticity checks. |
| **Payload Format** | A JSON object containing `iv`, `value`, and `mac`, all **Base64-encoded**, and then the entire JSON is **Base64-encoded** again. |

This multi-step encoding ensures a single, URL-safe, and text-friendly encrypted string.

-----

## Step-by-Step Decryption in Python

The provided Python function, `decrypt_laravel_string`, precisely mirrors the reverse of Laravel's encryption process.

### 1\. Extracting the Encryption Key

The **`APP_KEY`** in a Laravel `.env` file is often prefixed with `base64:`. The first step is to strip this prefix and decode the remaining string to get the raw 32-byte key.

```python
# 1. Decode the APP_KEY from its 'base64:' format
key = base64.b64decode(app_key.split('base64:')[1])
```

### 2\. Decoding and Parsing the Payload

The entire encrypted string is a single Base64-encoded JSON payload. This must be decoded back into a JSON string, and then parsed into a Python dictionary.

```python
# 2. Base64 decode the encrypted payload
payload = base64.b64decode(encrypted_str)
 
# 3. Parse the JSON to get iv, value, and mac
data = json.loads(payload)
```

Once parsed, the values for `iv` (Initialization Vector) and `value` (the ciphertext) are themselves Base64-encoded and must be decoded to their raw byte format for the actual decryption.

```python
iv = base64.b64decode(data['iv'])
value = base64.b64decode(data['value'])
mac = data['mac'] # Stays as a hex string for comparison
```

### 3\. Verifying the MAC (Integrity Check) 🛡️

The **Message Authentication Code (MAC)** is the cornerstone of secure decryption. It ensures that the encrypted data has not been tampered with since it was created.

The MAC is calculated using **HMAC-SHA256** over the **concatenation** of the Base64-encoded `iv` and `value` strings, using the raw encryption `key`.

```python
# 4. Verify the MAC
message = data['iv'] + data['value']
expected_mac = hmac.new(key, msg=message.encode(), digestmod=hashlib.sha256).hexdigest()

if not hmac.compare_digest(expected_mac, mac):
    raise ValueError("MAC is invalid. The payload has been tampered with.")
```

If the calculated MAC doesn't match the one in the payload, the function raises an error, preventing the decryption of potentially malicious data.

### 4\. Decrypting the Ciphertext

With the key and IV successfully extracted and the MAC verified, the final step is the **AES-256-CBC** decryption. This requires the `pycryptodome` library's `AES` module.

```python
# 5. Decrypt the value using AES-256-CBC
cipher = AES.new(key, AES.MODE_CBC, iv)
decrypted_padded = cipher.decrypt(value)
```

The output of the decryption step, `decrypted_padded`, includes padding (usually PKCS\#7) to ensure the plaintext was a multiple of the 16-byte block size. This padding must be removed.

```python
# 6. Unpad the decrypted data and return as a string
decrypted = unpad(decrypted_padded, AES.block_size)
return decrypted.decode('utf-8')
```

Finally, the resulting bytes are decoded into a standard UTF-8 string, yielding the original plaintext.

-----

## Summary of Dependencies

To execute this decryption logic successfully, you must have the **`pycryptodome`** library installed, as it provides the necessary robust cryptographic primitives (AES cipher and unpadding utility).

```bash
pip install pycryptodome
```

The other modules (`base64`, `json`, `hmac`, `hashlib`) are included in Python's standard library.

The full sample code is

```python
import base64
import json
import hmac
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

def decrypt_laravel_string(encrypted_str, app_key):
    """
    Decrypts a string that was encrypted using Laravel's Crypt::encryptString.
    """
    try:
        # 1. Decode the APP_KEY from its 'base64:' format
        key = base64.b64decode(app_key.split('base64:')[1])

        # 2. Base64 decode the encrypted payload
        payload = base64.b64decode(encrypted_str)
        
        # 3. Parse the JSON to get iv, value, and mac
        data = json.loads(payload)
        iv = base64.b64decode(data['iv'])
        value = base64.b64decode(data['value'])
        mac = data['mac']

        # 4. Verify the MAC to ensure the data was not tampered with
        message = data['iv'] + data['value']
        expected_mac = hmac.new(key, msg=message.encode(), digestmod=hashlib.sha256).hexdigest()
        
        if not hmac.compare_digest(expected_mac, mac):
            raise ValueError("MAC is invalid. The payload has been tampered with.")

        # 5. Decrypt the value using AES-256-CBC
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted_padded = cipher.decrypt(value)
        
        # 6. Unpad the decrypted data and return as a string
        decrypted = unpad(decrypted_padded, AES.block_size)
        return decrypted.decode('utf-8')

    except Exception as e:
        return f"An error occurred: {e}"


# --- Usage ---
# Your Laravel APP_KEY from the .env file
LARAVEL_APP_KEY = "base64:..." 

# The encrypted string from your database
ENCRYPTED_STRING = "eyJpdiI6Ik9MbUpk...iJ9"

decrypted_message = decrypt_laravel_string(ENCRYPTED_STRING, LARAVEL_APP_KEY)
print(decrypted_message)
```

The code essentially runs this logic `Crypt::decryptString($value);` assuming the right key is used.

