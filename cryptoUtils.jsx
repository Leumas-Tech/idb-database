// Importing necessary dependencies
import { openDB } from 'idb';

// Open a database
const dbPromise = openDB('apiKeysDB', 1, {
  upgrade(db) {
    db.createObjectStore('apiKeys');
  },
});

// Function to generate an encryption key using the Web Cryptography API
// Assuming you now store {encryptedData, iv, salt} for each user

// Updated key generation to include salt parameter
// Assuming the presence of a generateEncryptionKey function that optionally generates a new salt
// Helper function to convert Base64 string to Uint8Array
function base64ToUint8Array(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Adjusted generateEncryptionKey function
export const generateEncryptionKey = async (userId, generateNewSalt = false, salt) => {
    const enc = new TextEncoder();

    // If salt is provided as a string, assume it's in Base64 and convert it
    let saltArray;
    if (typeof salt === 'string') {
        saltArray = base64ToUint8Array(salt);
    } else if (salt instanceof Uint8Array) {
        saltArray = salt;
    } else if (!salt && generateNewSalt) {
        saltArray = window.crypto.getRandomValues(new Uint8Array(16)); // Generate new salt if needed
    } else {
        throw new Error('Salt is missing or in an unsupported format');
    }

    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(userId),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const key = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltArray,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    return { key, salt: saltArray };
};


  
// Function to encrypt data
export const encryptData = async (data, key) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
  const enc = new TextEncoder();
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(data)
  );
  return { encryptedData, iv };
};

// Function to decrypt data
export const decryptData = async ({ encryptedData, iv }, key) => {
  const dec = new TextDecoder();
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encryptedData
  );
  return dec.decode(decryptedData);
};

// Function to save data to IndexedDB
// Function to append a new API key data to the existing array for a user
export const saveToIndexedDB = async (storeName, userId, newData) => {
    const db = await dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    let currentData = await store.get(userId);
    // Ensure currentData is an array
    if (!Array.isArray(currentData)) {
        currentData = currentData ? [currentData] : [];
    }

    // Append the new data (ensuring it doesn't duplicate existing entries if needed)
    currentData.push(newData);

    await store.put(currentData, userId);
    await tx.done;
    console.log('API keys updated successfully.');
};




export const deleteApiKeyFromDB = async (storeName, userId, indexToDelete) => {
    const db = await dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    let currentData = await store.get(userId);
    if (!Array.isArray(currentData)) {
        console.error('Data structure error: Expected an array of API keys');
        throw new Error('Data structure error: Expected an array of API keys');
    }

    // Remove the API key at the specified index
    currentData.splice(indexToDelete, 1);

    // Save the updated array back to IndexedDB
    await store.put(currentData, userId);
    await tx.done;
    console.log('API key removed successfully.');
};


export const deleteAllApiKeysFromDB = async (storeName, userId) => {
    const db = await dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Instead of modifying and saving the array, simply clear all entries for the user
    await store.delete(userId);

    await tx.done;
    console.log('All API keys for user removed successfully.');
};



  
// Function to get data from IndexedDB
// Adjusted function to ensure it always returns an array
export const getFromIndexedDB = async (storeName, userId) => {
    const db = await dbPromise;
    const data = await db.transaction(storeName).objectStore(storeName).get(userId);
    // Ensure the return value is always an array
    return Array.isArray(data) ? data : data ? [data] : [];
};




// Fetching API Key for another component 

// In your cryptoUtils.js or a similar utility file

export const fetchApiKeys = async (userId) => {
    try {
      const dataFromDB = await getFromIndexedDB('apiKeys', userId);
      if (!dataFromDB || dataFromDB.length === 0) {
        console.log('No API keys found for this user.');
        return [];
      }
  
      const apiKeysArray = Array.isArray(dataFromDB) ? dataFromDB : [dataFromDB];
      const filteredApiKeysArray = apiKeysArray.filter(item => !Array.isArray(item));
  
      const keys = await Promise.all(filteredApiKeysArray.map(async (keyObj) => {
        const { encryptedData, iv, salt } = keyObj;
        const { key: encryptionKey } = await generateEncryptionKey(userId, false, salt);
        const decryptedData = await decryptData({ encryptedData, iv }, encryptionKey);
        return JSON.parse(decryptedData);
      }));
  
      return keys;
    } catch (error) {
      console.error('Error fetching API keys:', error);
      throw error; // Rethrow the error to be handled by the caller
    }
  };

  
  export const fetchApiKeysOfType = async (userId, apiKeyType) => {
    try {
        const dataFromDB = await getFromIndexedDB('apiKeys', userId);
        if (!dataFromDB || dataFromDB.length === 0) {
            console.log('No API keys found for this user.');
            return [];
        }

        // Convert to array if not already, and filter non-array items
        const apiKeysArray = Array.isArray(dataFromDB) ? dataFromDB : [dataFromDB];
        const filteredApiKeysArray = apiKeysArray.filter(item => !Array.isArray(item));

        const keys = await Promise.all(filteredApiKeysArray.map(async (keyObj) => {
            const { encryptedData, iv, salt } = keyObj;
            const { key: encryptionKey } = await generateEncryptionKey(userId, false, salt);
            const decryptedData = await decryptData({ encryptedData, iv }, encryptionKey);
            return JSON.parse(decryptedData);
        }));

        // Filter the keys by the specified apiKeyType
        const keysOfType = keys.filter(key => key.apiKeyType === apiKeyType);
        return keysOfType;
    } catch (error) {
        console.error(`Error fetching API keys of type ${apiKeyType}:`, error);
        throw error; // Rethrow the error to be handled by the caller
    }
};
