---
title: Using OpenSSL in C++ A Comprehensive Guide
pubDate: "2023-05-03T14:16:44.725Z"
description: "In this article, we will explore how to use OpenSSL in C++ to perform various cryptographic tasks, such as generating public and private key pairs, encrypting and decrypting data, and signing and verifying messages."
tags: ["cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2378078723.png
---
# Using OpenSSL in C++: A Comprehensive Guide

OpenSSL is a widely used, open-source toolkit that provides a full suite of cryptographic libraries and functions. It is commonly used for implementing security protocols such as SSL/TLS and a variety of other cryptographic operations. In this article, we will explore how to use OpenSSL in C++ to perform various cryptographic tasks, such as generating public and private key pairs, encrypting and decrypting data, and signing and verifying messages.

## Prerequisites

Before diving into the code, make sure you have the following prerequisites:

1. A basic understanding of C++ programming.
2. OpenSSL library installed on your system. If you haven't installed it yet, you can follow the [official installation guide](https://www.openssl.org/source/).
3. A C++ compiler that supports C++11 or later (e.g., GCC, Clang, or MSVC).

## Integrating OpenSSL with C++

To integrate OpenSSL into your C++ project, you'll need to include the necessary header files and link against the OpenSSL libraries. In your C++ source files, include the appropriate OpenSSL header files with:

```cpp
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <openssl/conf.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
```

When compiling your program, you'll need to link against the OpenSSL libraries. If you're using GCC or Clang, you can do this by adding `-lssl -lcrypto` to your compiler command line. For example:

```
g++ your_program.cpp -o your_program -lssl -lcrypto
```

## Generating Key Pairs

To generate a public and private key pair using OpenSSL, you can use the `EVP_PKEY` API. Here's an example of generating an RSA key pair:

```cpp
#include <iostream>
#include <openssl/evp.h>

EVP_PKEY *generate_key_pair() {
    EVP_PKEY_CTX *ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, nullptr);
    if (!ctx) {
        std::cerr << "Failed to create EVP_PKEY_CTX" << std::endl;
        return nullptr;
    }

    if (EVP_PKEY_keygen_init(ctx) <= 0) {
        std::cerr << "Failed to initialize keygen" << std::endl;
        EVP_PKEY_CTX_free(ctx);
        return nullptr;
    }

    if (EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, 2048) <= 0) {
        std::cerr << "Failed to set key length" << std::endl;
        EVP_PKEY_CTX_free(ctx);
        return nullptr;
    }

    EVP_PKEY *key = nullptr;
    if (EVP_PKEY_keygen(ctx, &key) <= 0) {
        std::cerr << "Failed to generate key pair" << std::endl;
        EVP_PKEY_CTX_free(ctx);
        return nullptr;
    }

    EVP_PKEY_CTX_free(ctx);
    return key;
}
```

This function initializes an `EVP_PKEY_CTX` for RSA key generation, sets the desired key length (2048 bits, in this case), and then generates the key pair. The function returns the generated key pair as an `EVP_PKEY` pointer, which can be used for various cryptographic operations.

## Encrypting and Decrypting Data

To encrypt and decrypt data using OpenSSL, you can use the `EVP_CIPHER` API. Here's an example of symmetric encryption using AES-256-GCM:

```cpp
#include <iostream>
#include <openssl/evp.h>

bool encrypt(const unsigned char *plaintext, int plaintext_len, const unsigned char *key, const unsigned char *iv, unsigned char *ciphertext, int &ciphertext_len) {
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        std::cerr << "Failed to create EVP_CIPHER_CTX" << std::endl;
        return false;
    }

    if (EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, key, iv) != 1) {
        std::cerr << "Failed to initialize encryption" << std::endl;
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    if (EVP_EncryptUpdate(ctx, ciphertext, &ciphertext_len, plaintext, plaintext_len) != 1) {
        std::cerr << "Failed to encrypt data" << std::endl;
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    EVP_CIPHER_CTX_free(ctx);
    return true;
}

bool decrypt(const unsigned char *ciphertext, int ciphertext_len, const unsigned char *key, const unsigned char *iv, unsigned char *plaintext, int &plaintext_len) {
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        std::cerr << "Failed to create EVP_CIPHER_CTX" << std::endl;
        return false;
    }

    if (EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, key, iv) != 1) {
        std::cerr << "Failed to initialize decryption" << std::endl;
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    if (EVP_DecryptUpdate(ctx, plaintext, &plaintext_len, ciphertext, ciphertext_len) != 1) {
        std::cerr << "Failed to decrypt data" << std::endl;
        EVP_CIPHER_CTX_free(ctx);
        return false;
    }

    EVP_CIPHER_CTX_free(ctx);
    return true;
}
```

These functions take in the plaintext (or ciphertext), its length, the key, and the initialization vector (IV) as input, and perform the corresponding encryption (or decryption) operation. The resulting ciphertext (or plaintext) and its length are output as parameters.

## Signing and Verifying Messages

To sign and verify messages using OpenSSL, you can use the `EVP_DigestSign` and `EVP_DigestVerify` APIs. Here's an example of signing and verifying a message using SHA-256 and an RSA key pair:

```cpp
#include <iostream>
#include <openssl/evp.h>

bool sign(EVP_PKEY *private_key, const unsigned char *message, int message_len, unsigned char *signature, unsigned int &signature_len) {
    EVP_MD_CTX *ctx = EVP_MD_CTX_create();
    if (!ctx) {
        std::cerr << "Failed to create EVP_MD_CTX" << std::endl;
        return false;
    }

    if (EVP_DigestSignInit(ctx, nullptr, EVP_sha256(), nullptr, private_key) != 1) {
        std::cerr << "Failed to initialize signing" << std::endl;
        EVP_MD_CTX_destroy(ctx);
        return false;
    }

    if (EVP_DigestSignUpdate(ctx, message, message_len) != 1) {
        std::cerr << "Failed to update signing" << std::endl;
        EVP_MD_CTX_destroy(ctx);
        return false;
    }

    if (EVP_DigestSignFinal(ctx, signature, &signature_len) != 1) {
        std::cerr << "Failed to finalize signing" << std::endl;
        EVP_MD_CTX_destroy(ctx);
        return false;
    }

    EVP_MD_CTX_destroy(ctx);
    return true;
}

bool verify(EVP_PKEY *public_key, const unsigned char *message, int message_len, const unsigned char *signature, unsigned int signature_len) {
    EVP_MD_CTX *ctx = EVP_MD_CTX_create();
    if (!ctx) {
        std::cerr << "Failed to create EVP_MD_CTX" << std::endl;
        return false;
    }

    if (EVP_DigestVerifyInit(ctx, nullptr, EVP_sha256(), nullptr, public_key) != 1) {
        std::cerr << "Failed to initialize verification" << std::endl;
        EVP_MD_CTX_destroy(ctx);
        return false;
    }

    if (EVP_DigestVerifyUpdate(ctx, message, message_len) != 1) {
        std::cerr << "Failed to update verification" << std::endl;
        EVP_MD_CTX_destroy(ctx);
        return false;
    }

    int result = EVP_DigestVerifyFinal(ctx, signature, signature_len);
    EVP_MD_CTX_destroy(ctx);

    if (result != 1) {
        std::cerr << "Failed to finalize verification" << std::endl;
        return false;
    }

    return true;
}
```

These functions take in the message and its length, as well as the private (or public) key, and perform the corresponding signing (or verification) operation. The resulting signature and its length are output as parameters in the `sign` function.

## Conclusion

In this article, we've explored how to use OpenSSL in C++ to perform various cryptographic tasks, such as generating key pairs, encrypting and decrypting data, and signing and verifying messages. By integrating OpenSSL into your C++ projects, you can take advantage of its powerful cryptographic capabilities to secure your applications and protect sensitive data.
