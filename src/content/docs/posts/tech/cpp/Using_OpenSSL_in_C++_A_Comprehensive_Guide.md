---
title: "OpenSSL 3 in C++: RSA keys, signatures, and AES-256-GCM encryption"
pubDate: "2023-05-03T14:16:44.725Z"
lastUpdated: 2026-11-14
description: "Use OpenSSL 3's EVP API from C++ to generate an RSA key, sign and verify a message with SHA-256, and encrypt data with AES-256-GCM, tag check included."
tags: ["cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2378078723.png
---

OpenSSL is two libraries: `libssl` implements TLS, and `libcrypto` provides the primitives underneath it (hashes, ciphers, public-key algorithms, random numbers). For signing and encrypting data in your own program you only need `libcrypto`, through its high-level **EVP** interface.

This post builds one small program that generates an RSA key, signs and verifies a message, and encrypts and decrypts data with AES-256-GCM. It targets OpenSSL 3.x (the 1.1.1 series is end-of-life) and avoids APIs that OpenSSL 4.0 removed.

## Setup

Install the development package (`libssl-dev` on Debian/Ubuntu, `openssl-devel` on Fedora, `brew install openssl@3` on macOS, or `vcpkg install openssl`). Then compile and link against `libcrypto`:

```sh
g++ -std=c++17 crypto_demo.cpp -o crypto_demo -lcrypto
```

With CMake, `find_package(OpenSSL REQUIRED)` and link `OpenSSL::Crypto`. Add `-lssl` / `OpenSSL::SSL` only if you use TLS.

The examples manage OpenSSL objects with `std::unique_ptr` and the matching `*_free` function, so nothing leaks on early returns. When a call fails, `ERR_print_errors_fp(stderr)` prints OpenSSL's error queue, which is far more useful than a generic "failed" message.

## Generating an RSA key pair

OpenSSL 3.0 added `EVP_RSA_gen()`, a one-call shortcut:

```cpp
#include <openssl/evp.h>
#include <openssl/rsa.h>

EVP_PKEY* key = EVP_RSA_gen(2048);  // nullptr on failure; free with EVP_PKEY_free
```

The longer form, which also works on 1.1.1 and lets you set more options, is `EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, nullptr)` → `EVP_PKEY_keygen_init()` → `EVP_PKEY_CTX_set_rsa_keygen_bits()` → `EVP_PKEY_keygen()`.

The resulting `EVP_PKEY` holds both halves of the pair. To share the public key, write it out with `PEM_write_bio_PUBKEY()` and load it elsewhere with `PEM_read_bio_PUBKEY()`.

## Signing and verifying

`EVP_DigestSign()` hashes and signs in one call. Calling it first with a null output buffer returns the maximum signature size, so you can size the buffer correctly. Note that the length parameter is a `size_t*`, not an `unsigned int`.

```cpp
using MdCtx = std::unique_ptr<EVP_MD_CTX, decltype(&EVP_MD_CTX_free)>;

std::vector<unsigned char> sign(EVP_PKEY* key, const std::string& msg) {
    MdCtx ctx(EVP_MD_CTX_new(), EVP_MD_CTX_free);
    auto data = reinterpret_cast<const unsigned char*>(msg.data());
    size_t sig_len = 0;

    if (!ctx ||
        EVP_DigestSignInit(ctx.get(), nullptr, EVP_sha256(), nullptr, key) != 1 ||
        EVP_DigestSign(ctx.get(), nullptr, &sig_len, data, msg.size()) != 1) {
        return {};
    }

    std::vector<unsigned char> sig(sig_len);
    if (EVP_DigestSign(ctx.get(), sig.data(), &sig_len, data, msg.size()) != 1) {
        return {};
    }
    sig.resize(sig_len);
    return sig;
}

bool verify(EVP_PKEY* key, const std::string& msg, const std::vector<unsigned char>& sig) {
    MdCtx ctx(EVP_MD_CTX_new(), EVP_MD_CTX_free);
    auto data = reinterpret_cast<const unsigned char*>(msg.data());

    // EVP_DigestVerify returns 1 for a valid signature, 0 for an invalid one,
    // and a negative value for other errors.
    return ctx &&
           EVP_DigestVerifyInit(ctx.get(), nullptr, EVP_sha256(), nullptr, key) == 1 &&
           EVP_DigestVerify(ctx.get(), sig.data(), sig.size(), data, msg.size()) == 1;
}
```

With an RSA key and no extra options this produces PKCS#1 v1.5 signatures. For RSA-PSS, set `EVP_PKEY_CTX_set_rsa_padding(pctx, RSA_PKCS1_PSS_PADDING)` on the `EVP_PKEY_CTX` returned through the second argument of the init calls.

## Encrypting and decrypting with AES-256-GCM

GCM is an authenticated mode: encryption produces a ciphertext *and* a 16-byte tag, and decryption must check that tag. If you skip `EVP_EncryptFinal_ex` / `EVP_DecryptFinal_ex` and the tag handling, you get unauthenticated ciphertext and lose the reason for choosing GCM.

The rules that matter:

- The key is 32 random bytes. Use `RAND_bytes`, never `rand()`.
- The IV (nonce) is 12 bytes, GCM's default length, and must **never** be reused with the same key. A fresh random IV per message is fine; store it next to the ciphertext. It isn't secret.
- Decryption only succeeds if `EVP_DecryptFinal_ex` returns 1. Otherwise discard the output, because the data or tag was tampered with.

```cpp
using CipherCtx = std::unique_ptr<EVP_CIPHER_CTX, decltype(&EVP_CIPHER_CTX_free)>;
constexpr int kTagLen = 16;

bool aes_gcm_encrypt(const std::vector<unsigned char>& plaintext,
                     const unsigned char* key, const unsigned char* iv,
                     std::vector<unsigned char>& ciphertext, unsigned char* tag) {
    CipherCtx ctx(EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
    if (!ctx) return false;
    if (EVP_EncryptInit_ex(ctx.get(), EVP_aes_256_gcm(), nullptr, key, iv) != 1) return false;

    ciphertext.resize(plaintext.size());
    int len = 0;
    if (EVP_EncryptUpdate(ctx.get(), ciphertext.data(), &len,
                          plaintext.data(), static_cast<int>(plaintext.size())) != 1) return false;
    int total = len;

    if (EVP_EncryptFinal_ex(ctx.get(), ciphertext.data() + total, &len) != 1) return false;
    total += len;
    ciphertext.resize(total);

    return EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_GET_TAG, kTagLen, tag) == 1;
}

bool aes_gcm_decrypt(const std::vector<unsigned char>& ciphertext,
                     const unsigned char* key, const unsigned char* iv,
                     const unsigned char* tag, std::vector<unsigned char>& plaintext) {
    CipherCtx ctx(EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
    if (!ctx) return false;
    if (EVP_DecryptInit_ex(ctx.get(), EVP_aes_256_gcm(), nullptr, key, iv) != 1) return false;

    plaintext.resize(ciphertext.size());
    int len = 0;
    if (EVP_DecryptUpdate(ctx.get(), plaintext.data(), &len,
                          ciphertext.data(), static_cast<int>(ciphertext.size())) != 1) return false;
    int total = len;

    // The expected tag must be set before the final call.
    if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_GCM_SET_TAG, kTagLen,
                            const_cast<unsigned char*>(tag)) != 1) return false;

    if (EVP_DecryptFinal_ex(ctx.get(), plaintext.data() + total, &len) != 1) {
        plaintext.clear();  // authentication failed
        return false;
    }
    plaintext.resize(total + len);
    return true;
}
```

To authenticate unencrypted metadata as well (a header, a record ID), pass it as additional authenticated data with an `EVP_EncryptUpdate` / `EVP_DecryptUpdate` call that has a null output buffer, before the first real update.

## Putting it together

Paste the `sign`, `verify`, `aes_gcm_encrypt` and `aes_gcm_decrypt` functions above `main` in one file:

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include <openssl/err.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/rsa.h>

// ... sign, verify, aes_gcm_encrypt, aes_gcm_decrypt from above ...

int main() {
    // Signatures
    std::unique_ptr<EVP_PKEY, decltype(&EVP_PKEY_free)> key(EVP_RSA_gen(2048), EVP_PKEY_free);
    if (!key) {
        ERR_print_errors_fp(stderr);
        return 1;
    }

    const std::string message = "transfer 100 to alice";
    auto sig = sign(key.get(), message);
    std::cout << "signature bytes: " << sig.size() << '\n';
    std::cout << "valid: " << verify(key.get(), message, sig) << '\n';
    std::cout << "tampered valid: " << verify(key.get(), message + "!", sig) << '\n';

    // Authenticated encryption
    unsigned char aes_key[32], iv[12], tag[kTagLen];
    if (RAND_bytes(aes_key, sizeof(aes_key)) != 1 || RAND_bytes(iv, sizeof(iv)) != 1) {
        ERR_print_errors_fp(stderr);
        return 1;
    }

    std::vector<unsigned char> plaintext(message.begin(), message.end());
    std::vector<unsigned char> ciphertext, decrypted;

    if (!aes_gcm_encrypt(plaintext, aes_key, iv, ciphertext, tag)) {
        ERR_print_errors_fp(stderr);
        return 1;
    }
    bool ok = aes_gcm_decrypt(ciphertext, aes_key, iv, tag, decrypted);
    std::cout << "decrypted: " << (ok ? std::string(decrypted.begin(), decrypted.end()) : "<auth failed>")
              << '\n';

    ciphertext[0] ^= 1;  // flip one bit
    std::cout << "tampered decrypt ok: " << aes_gcm_decrypt(ciphertext, aes_key, iv, tag, decrypted)
              << '\n';
    return 0;
}
```

Expected output: a 256-byte signature, `valid: 1`, `tampered valid: 0`, the original message, and `tampered decrypt ok: 0`. The tampered verification may also leave entries on OpenSSL's error queue; call `ERR_clear_error()` if you check the queue afterwards.

## Gotchas

- Older code uses `EVP_MD_CTX_create` / `EVP_MD_CTX_destroy`; these are legacy aliases for `EVP_MD_CTX_new` / `EVP_MD_CTX_free`.
- Low-level APIs such as `RSA_new`, `RSA_generate_key_ex`, `AES_encrypt` and `SHA256_Init` are deprecated since OpenSSL 3.0. Stick to EVP so the same code works with providers (including the FIPS provider).
- OpenSSL 4.0 removed the ENGINE API and custom `EVP_CIPHER`/`EVP_MD`/`EVP_PKEY` method creation. Nothing in this post uses them.
- Don't invent your own protocol on top of these primitives if a standard one fits. For encrypting data between services, TLS or a library like libsodium is harder to misuse.

## Further reading

- [OpenSSL 3 documentation](https://docs.openssl.org/3.0/)
- [EVP_EncryptInit(3)](https://docs.openssl.org/3.0/man3/EVP_EncryptInit/), including the AEAD/GCM notes
- [EVP_DigestSignInit(3)](https://docs.openssl.org/3.0/man3/EVP_DigestSignInit/)
- [APIs removed in OpenSSL 4.0](https://docs.openssl.org/4.0/man7/ossl-removed-api/)
