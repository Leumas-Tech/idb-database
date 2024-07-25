import React, { useEffect, useState } from 'react';
import { fetchApiKeysOfType } from './cryptoUtils'; // Adjust the path based on your file structure
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';

const Component2 = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedAPIKey, setSelectedAPIKey] = useState('');
  const authUser = useAuthUser(); // Use the hook to get the authenticated user
  const userId = authUser?.id || "UserOne"; // Assuming the user object has an id property
  const apiKeyType = "OpenAI";

  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const keys = await fetchApiKeysOfType(userId, apiKeyType);
        setApiKeys(keys);
        // Automatically select the first API key if available
        if (keys.length > 0) {
          setSelectedAPIKey(keys[0].apiKey);
        }
      } catch (error) {
        console.error(`Failed to fetch API keys of type ${apiKeyType}:`, error);
      }
    };

    loadApiKeys();
  }, [userId, apiKeyType]);

  // Function to handle API key selection change
  const handleSelectChange = (event) => {
    setSelectedAPIKey(event.target.value);
  };

  // Function to use the selected API key
  const useApiKey = () => {
    if (!selectedAPIKey) {
      console.error("API Key not selected or not found.");
      return;
    }

    // Use the selectedAPIKey here for whatever you need
    console.log(`Using selected API Key:`, selectedAPIKey);
  };

  return (
<div className="min-h-screen flex flex-col items-center justify-center border rounded-lg px-4 py-6">
  <p className="text-lg ">User ID: {userId}</p>
  
  <div className="mt-6">
    <h3 className="text-xl font-semibold mb-4">Select an API Key:</h3>
    <select 
      value={selectedAPIKey} 
      onChange={handleSelectChange}
      className="bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
    >
      {apiKeys.map((key, index) => (
        <option key={index} value={key.apiKey}>
          {key.apiKeyType} Key {index + 1}
        </option>
      ))}
    </select>
  </div>
  
  <div className="mt-6">
    <p className="text-md  mb-2">Selected API Key: <span className="font-semibold">{selectedAPIKey}</span></p>
    <button 
      onClick={useApiKey} 
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-150"
    >
      Use Selected API Key
    </button>
  </div>
</div>
  );
};

export default Component2;
