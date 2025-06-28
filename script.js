document.addEventListener('DOMContentLoaded', () => {
    const streamContainer = document.getElementById('stream-container');
    const searchBar = document.getElementById('search-bar');
    const loadingMessage = document.getElementById('loading-message');

    let allStreams = []; // This will store the full list of streams

    // Function to fetch stream data from the JSON file
    const fetchStreams = async () => {
        try {
            // Add a cache-busting parameter to ensure we get the latest file
            const response = await fetch(`drops.json?v=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allStreams = data;
            renderStreams(allStreams);
            if(loadingMessage) {
                loadingMessage.style.display = 'none'; // Hide loading message
            }
        } catch (error) {
            console.error("Failed to fetch stream data:", error);
            if(loadingMessage) {
                loadingMessage.textContent = 'Failed to load stream data. Please try again later.';
            }
        }
    };

    // Function to render the stream cards on the page
    const renderStreams = (streams) => {
        streamContainer.innerHTML = ''; // Clear existing content

        if (streams.length === 0) {
            streamContainer.innerHTML = '<p id="no-results-message">No streams found matching your search.</p>';
            return;
        }

        streams.forEach(stream => {
            const card = document.createElement('a');
            card.href = `https://www.twitch.tv/${stream.name}`;
            card.className = 'stream-card';
            card.target = '_blank'; // Open in a new tab
            card.rel = 'noopener noreferrer';

            card.innerHTML = `
                <div class="card-content">
                    <h2>${stream.name}</h2>
                    <p class="game">${stream.game}</p>
                    <div class="card-footer">
                        <span class="live-dot"></span>
                        <span>${parseInt(stream.viewers).toLocaleString()} viewers</span>
                    </div>
                </div>
            `;
            streamContainer.appendChild(card);
        });
    };

    // Event listener for the search bar
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        const filteredStreams = allStreams.filter(stream => 
            stream.game.toLowerCase().includes(searchTerm)
        );
        
        renderStreams(filteredStreams);
    });

    // Initial fetch of the streams
    fetchStreams();
});
