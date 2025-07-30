import axios from "axios";

const BASE_ID = "applqO7LmDa1HLTEs";
const USER_TABLE_ID = "tbl0LJPveJGeu7SK2";
const MED_TABLE_ID = "tblXldXDqZIrFgyTm";
const JOURNAL_TABLE_ID = "tblNZajAGEiNSdU4U";
const PROMPT_TABLE_ID = "tblMoSlXmwjBqICGV";
const API_TOKEN = "patI8m8TdxXWzYg4Y.458904d2c40c330ec243a55e51a3439cd9983fe73ad66111f08ed10cb567e5b6";

// Base URL for Airtable API
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${USER_TABLE_ID}`;
const MED_TABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${MED_TABLE_ID}`;
const JOURNAL_TABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${JOURNAL_TABLE_ID}`;
const PROMPT_TABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${PROMPT_TABLE_ID}`;

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
      // filterByFormula needs parentheses around formula
      const url = `${AIRTABLE_URL}?filterByFormula=({email}='${email}')`;
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
   * @param {Object} fields - Field values including multi-select Condition as an array
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
   * @param {Object} fields - Field values including multi-select Condition as an array
   */
  updateRecord: async (recordId, fields) => {
    try {
      const url = `${AIRTABLE_URL}/${recordId}`;
      const response = await axios.patch(
        url,
        { fields },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      // Airtable returns the updated record
      return response.data;
    } catch (error) {
      console.error("Error updating user record:", error);
      return null;
    }
  },

  /**
   * Shortcut to update only the Condition multi-select field
   * @param {string} recordId
   * @param {string[]} conditions
   */
  // updateConditions: async (recordId, conditions) => {
  //   return AirtableService.updateRecord(recordId, { Condition: conditions });
  // },
  updateConditions: async (recordId, conditions) => {
    // join into a single comma-separated string for a plain-text field
    const condString = conditions.join(', ');
    return AirtableService.updateRecord(recordId, { Condition: condString });
  },

  /**
   * Delete a user record
   * @param {string} recordId
   */
  deleteRecord: async (recordId) => {
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
  addMedication: async (fields) => {
    try {
      const response = await axios.post(
        MED_TABLE_URL,
        { records: [{ fields }] },
        { headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      return response.data.records;
    } catch (e) {
      console.error('Error adding medication:', e);
      return null;
    }
  },

  /**
   * Get user medication list
   */
  getMedicationsForUser: async (recordId) => {
    try {
      const url = `${MED_TABLE_URL}?filterByFormula=FIND('${recordId}', {Foreign Record ID})`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      return response.data.records.map((rec) => ({
        id: rec.id,
        name: rec.fields.Name,
        dosage: rec.fields.Dosage,
        frequency: rec.fields.Frequency,
        duration: rec.fields.Duration,
        notes: rec.fields["Additional Notes"],
        reminderDays: rec.fields["Reminder Days"] || [],
        reminderTimes: rec.fields["Reminder Times"] ? rec.fields["Reminder Times"].split(",").map((t) => t.trim()) : [],
      }));
    } catch (e) {
      console.error("Error fetching user medications: ", e);
      return [];
    }
  },

  /**
   * Update a medication record
   */
  updateMedication: async (recordId, fields) => {
    try {
      const url = `${MED_TABLE_URL}/${recordId}`;
      const response = await axios.patch(
        url,
        { fields },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (e) {
      console.error("Error updating medication: ", e);
      return null;
    }
  },

  /**
   * Delete a medication record
   */
  deleteMedication: async (recordId) => {
    try {
      const url = `${MED_TABLE_URL}/${recordId}`;
      const response = await axios.delete(url, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      return response.status === 200;
    } catch (e) {
      console.error("Error deleting medication: ", e);
      return false;
    }
  },

  /**
   * Add a new journal entry
   * @param {Object} fields - Field values for the journal entry (User, Date, Response, Prompt Used, Scale, Emotions, etc.)
   */
  addJournalEntry: async (fields) => {
    try {
      const response = await axios.post(
        JOURNAL_TABLE_URL,
        { records: [{ fields }] },
        { headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      return response.data.records;
    } catch (e) {
      console.error('Error adding journal entry:', e);
      return null;
    }
  },

  /**
   * Fetch all prompt records from the Prompt table
   */
  getAllPrompts: async () => {
    try {
      const response = await axios.get(PROMPT_TABLE_URL, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data.records;
    } catch (error) {
      console.error('Error fetching prompts:', error);
      return [];
    }
  },

  /**
   * Fetch all journal entries for a given user
   * @param {string} userId
   */
  getAllJournalEntriesForUser: async (userId) => {
    try {
      // First, let's try to get all entries without filtering to see what we get
      const url = `${JOURNAL_TABLE_URL}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('All journal entries (no filter):', JSON.stringify(response.data.records, null, 2));
      return response.data.records;
    } catch (error) {
      console.error('Error fetching journal entries for user:', error);
      return [];
    }
  },
};

export default AirtableService;
