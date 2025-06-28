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

// --- THIS FUNCTION HAS BEEN REWRITTEN ---
/**
 * Gets ALL live streams with the "Drops Enabled" tag by fetching page after page.
 */
async function getDropsStreams(token) {
  let allStreams = [];
  let cursor = null;
  let pageCount = 0;
  const pageLimit = 10; // Safeguard: stops after 10 pages (1000 streams)

  console.log("Fetching all streams with drops enabled (with pagination)...");

  do {
    pageCount++;
    console.log(`Fetching page ${pageCount}...`);
    try {
      const response = await axios.get('https://api.twitch.tv/helix/streams', {
        headers: {
          'Client-ID': CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
        params: {
          tag_id: DROPS_ENABLED_TAG_ID,
          first: 100, // Always get the max number per page
          after: cursor, // Use the cursor to get the next page
        },
      });

      const { data, pagination } = response.data;
      
      if (data && data.length > 0) {
        // Add the streams from the current page to our main list
        allStreams.push(...data);
        // Get the cursor for the *next* page
        cursor = pagination.cursor;
      } else {
        // No more data, stop the loop
        cursor = null;
      }

    } catch (error) {
      console.error(`❌ Failed to fetch page ${pageCount}:`, error.response?.data || error.message);
      // Stop the loop on error to prevent further issues
      cursor = null;
    }
  } while (cursor && pageCount < pageLimit); // Continue if there's a next page and we haven't hit our limit

  if (pageCount >= pageLimit) {
      console.log(`⚠️ Reached page limit of ${pageLimit}. There may be more streams available.`);
  }
  
  // Now that we have all streams, format them into our desired structure
  const formattedStreams = allStreams.map(stream => ({
    name: stream.user_login,
    game: stream.game_name,
    viewers: stream.viewer_count.toString(),
  }));

  console.log(`✅ Found a total of ${formattedStreams.length} streams across ${pageCount} page(s).`);
  return formattedStreams;
}
// ----------------------------------------------------


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
