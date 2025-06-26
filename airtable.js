import axios from "axios";

const BASE_ID = "applqO7LmDa1HLTEs";
const TABLE_ID = "tbl0LJPveJGeu7SK2";
const API_TOKEN = "patnIDtcJiejdkJNV.8f5783831e933f6c610d4e3c457102bc19eed9e05562bda499d60c5582249f98";

// Base URL for Airtable API
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
// const AIRTABLE_TABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${ACTIVITIES_TABLE_ID}`;


const AirtableService = {
    /**
     * Fetch all user records
     */
    getAllUsers: async () => {
      try {
        const response = await axios.get(AIRTABLE_URL, {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        });
        return response.data.records;
      } catch (error) {
        console.error("Error fetching user records:", error);
        return [];
      }
    },
  
    /**
     * Fetch a user by email
     * @param {string} email
     */
    getUserByEmail: async (email) => {
      try {
        const url = `${AIRTABLE_URL}?filterByFormula={email}='${email}'`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        });
        return response.data.records;
      } catch (error) {
        console.error("Error fetching user by email:", error);
        return [];
      }
    },
  
    /**
     * Create a new user record
     * @param {Object} fields - Key/value pairs matching column names (e.g. { name, email, password, "date of birth": "YYYY-MM-DD", Condition, "notification times": "..." })
     */
    addUser: async (fields) => {
      try {
        const response = await axios.post(
          AIRTABLE_URL,
          { records: [{ fields }] },
          { headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" } }
        );
        return response.data.records;
      } catch (error) {
        console.error("Error adding user record:", error);
        return null;
      }
    },
  
    /**
     * Update an existing user record
     * @param {string} recordId
     * @param {Object} fields - Updated fields
     */
    updateUser: async (recordId, fields) => {
      try {
        const url = `${AIRTABLE_URL}/${recordId}`;
        const response = await axios.patch(
          url,
          { fields },
          { headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" } }
        );
        return response.data.records;
      } catch (error) {
        console.error("Error updating user record:", error);
        return null;
      }
    },
  
    /**
     * Delete a user record
     * @param {string} recordId
     */
    deleteUser: async (recordId) => {
      try {
        const url = `${AIRTABLE_URL}/${recordId}`;
        const response = await axios.delete(url, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });
        return response.status === 200;
      } catch (error) {
        console.error("Error deleting user record:", error);
        return false;
      }
    },
  };
  
  export default AirtableService;
  