using System;
using System.Security.Cryptography; // v6.0.0 - Core cryptography functionality
using System.Text; // v6.0.0 - Text encoding utilities
using Microsoft.Extensions.Configuration; // v6.0.0 - Configuration management

namespace ServiceProvider.Common.Helpers
{
    /// <summary>
    /// Thread-safe static helper class providing enterprise-grade encryption and decryption utilities
    /// using AES-256 encryption with proper key derivation and IV handling following NIST recommendations.
    /// </summary>
    public static class EncryptionHelper
    {
        // Constants for encryption parameters following NIST recommendations
        private const int KeySize = 256;
        private const int BlockSize = 128;
        private const int Iterations = 10000;
        private const int SaltSize = 16;
        private const int IVSize = 16;

        /// <summary>
        /// Encrypts a string value using AES-256 in CBC mode with a random IV and PBKDF2 key derivation.
        /// </summary>
        /// <param name="plainText">The text to encrypt</param>
        /// <param name="key">The encryption key</param>
        /// <returns>Base64 encoded string containing IV and encrypted data</returns>
        /// <exception cref="ArgumentNullException">Thrown when plainText or key is null</exception>
        /// <exception cref="ArgumentException">Thrown when plainText or key is empty</exception>
        public static string Encrypt(string plainText, string key)
        {
            if (string.IsNullOrEmpty(plainText)) throw new ArgumentNullException(nameof(plainText));
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));

            byte[] iv = new byte[IVSize];
            byte[] salt = new byte[SaltSize];

            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(iv);
                rng.GetBytes(salt);
            }

            byte[] encryptedData;
            using (var aes = Aes.Create())
            {
                aes.KeySize = KeySize;
                aes.BlockSize = BlockSize;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using (var pbkdf2 = new Rfc2898DeriveBytes(key, salt, Iterations, HashAlgorithmName.SHA256))
                {
                    aes.Key = pbkdf2.GetBytes(KeySize / 8);
                    aes.IV = iv;

                    using (var encryptor = aes.CreateEncryptor())
                    using (var msEncrypt = new System.IO.MemoryStream())
                    {
                        using (var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
                        using (var swEncrypt = new System.IO.StreamWriter(csEncrypt))
                        {
                            swEncrypt.Write(plainText);
                        }
                        encryptedData = msEncrypt.ToArray();
                    }
                }
            }

            // Combine salt + IV + encrypted data
            var combinedData = new byte[SaltSize + IVSize + encryptedData.Length];
            Buffer.BlockCopy(salt, 0, combinedData, 0, SaltSize);
            Buffer.BlockCopy(iv, 0, combinedData, SaltSize, IVSize);
            Buffer.BlockCopy(encryptedData, 0, combinedData, SaltSize + IVSize, encryptedData.Length);

            return Convert.ToBase64String(combinedData);
        }

        /// <summary>
        /// Decrypts an AES-256 encrypted string using provided key and embedded IV.
        /// </summary>
        /// <param name="cipherText">The encrypted text to decrypt</param>
        /// <param name="key">The decryption key</param>
        /// <returns>Original decrypted plain text string</returns>
        /// <exception cref="ArgumentNullException">Thrown when cipherText or key is null</exception>
        /// <exception cref="ArgumentException">Thrown when cipherText or key is empty or invalid</exception>
        public static string Decrypt(string cipherText, string key)
        {
            if (string.IsNullOrEmpty(cipherText)) throw new ArgumentNullException(nameof(cipherText));
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));

            byte[] combinedData = Convert.FromBase64String(cipherText);
            
            if (combinedData.Length < SaltSize + IVSize) 
                throw new ArgumentException("Invalid cipher text format", nameof(cipherText));

            byte[] salt = new byte[SaltSize];
            byte[] iv = new byte[IVSize];
            byte[] encryptedData = new byte[combinedData.Length - SaltSize - IVSize];

            Buffer.BlockCopy(combinedData, 0, salt, 0, SaltSize);
            Buffer.BlockCopy(combinedData, SaltSize, iv, 0, IVSize);
            Buffer.BlockCopy(combinedData, SaltSize + IVSize, encryptedData, 0, encryptedData.Length);

            using (var aes = Aes.Create())
            {
                aes.KeySize = KeySize;
                aes.BlockSize = BlockSize;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using (var pbkdf2 = new Rfc2898DeriveBytes(key, salt, Iterations, HashAlgorithmName.SHA256))
                {
                    aes.Key = pbkdf2.GetBytes(KeySize / 8);
                    aes.IV = iv;

                    using (var decryptor = aes.CreateDecryptor())
                    using (var msDecrypt = new System.IO.MemoryStream(encryptedData))
                    using (var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read))
                    using (var srDecrypt = new System.IO.StreamReader(csDecrypt))
                    {
                        return srDecrypt.ReadToEnd();
                    }
                }
            }
        }

        /// <summary>
        /// Generates a cryptographically secure random key suitable for AES-256 encryption.
        /// </summary>
        /// <returns>Base64 encoded 32-byte random key</returns>
        public static string GenerateKey()
        {
            byte[] key = new byte[KeySize / 8];
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(key);
            }
            return Convert.ToBase64String(key);
        }

        /// <summary>
        /// Creates a secure hash of a password using PBKDF2 with a random salt.
        /// </summary>
        /// <param name="password">The password to hash</param>
        /// <returns>Base64 encoded string containing salt and password hash</returns>
        /// <exception cref="ArgumentNullException">Thrown when password is null</exception>
        /// <exception cref="ArgumentException">Thrown when password is empty</exception>
        public static string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password)) throw new ArgumentNullException(nameof(password));

            byte[] salt = new byte[SaltSize];
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(salt);
            }

            byte[] hash;
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256))
            {
                hash = pbkdf2.GetBytes(KeySize / 8);
            }

            byte[] combinedHash = new byte[SaltSize + hash.Length];
            Buffer.BlockCopy(salt, 0, combinedHash, 0, SaltSize);
            Buffer.BlockCopy(hash, 0, combinedHash, SaltSize, hash.Length);

            return Convert.ToBase64String(combinedHash);
        }
    }
}