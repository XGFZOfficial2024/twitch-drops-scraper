import axios from 'axios';
import fs from 'fs';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

// The official Tag ID for "Drops Enabled"
const DROPS_ENABLED_TAG_ID = "c2542d6d-cd10-4532-919b-3d19f30a768b";

/**
 * Gets an App Access Token from Twitch
 */
async function getAccessToken() {
  console.log("Requesting Twitch API access token...");
  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`
    );
    console.log("✅ Access token received.");
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Failed to get access token:", error.response?.data || error.message);
    throw new Error("Could not get Twitch access token.");
  }
}

/**
 * Gets a list of live streams with the "Drops Enabled" tag
 */
async function getDropsStreams(token) {
  console.log("Fetching streams with drops enabled...");
  try {
    const response = await axios.get('https://api.twitch.tv/helix/streams', {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
      params: {
        // We look for streams with the specific tag ID. 'first: 100' gets the max per page.
        tag_id: DROPS_ENABLED_TAG_ID,
        first: 100,
        last: 100,
      },
    });

    // The API returns a 'data' array. We format it to match our old structure.
    const streams = response.data.data.map(stream => ({
      name: stream.user_login,
      game: stream.game_name,
      viewers: stream.viewer_count.toString(),
    }));
    
    console.log(`✅ Found ${streams.length} streams.`);
    return streams;

  } catch (error) {
    console.error("❌ Failed to fetch streams:", error.response?.data || error.message);
    throw new Error("Could not fetch streams from Twitch API.");
  }
}


// --- Main Execution ---
(async () => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Fatal: TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set.");
    process.exit(1);
  }

  try {
    const accessToken = await getAccessToken();
    const streamsData = await getDropsStreams(accessToken);
    
    fs.writeFileSync("drops.json", JSON.stringify(streamsData, null, 2));
    console.log("Successfully wrote drops data to drops.json");

  } catch (error) {
    console.error("Scraper failed during execution:", error.message);
    process.exit(1);
  }
})();
