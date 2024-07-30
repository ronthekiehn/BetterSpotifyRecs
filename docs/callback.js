document.addEventListener('DOMContentLoaded', handleCallback);

var stateKey = 'spotify_auth_state';
async function requestToken(code) {
    const url = 'https://accounts.spotify.com/api/token';
    const body = new URLSearchParams({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
    });

    const headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(client_id + ':' + client_secret)
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body.toString()
    });

    if (response.ok) {
        return await response.json();
    } else {
        throw new Error('Failed to fetch token');
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  // Get the stored state from cookies
  

async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = getCookie(stateKey);

    if (!state || state !== storedState) {
        throw new Error("state mismatch");
    }

    document.cookie = `${stateKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;


    try {
        const data = await requestToken(code);
        res.cookie('signedIn', 'true');
        console.log("Signed in");
        localStorage.setItem('spotify_access_token', data.access_token);
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
        
        window.location.href = '/';
    } catch (error) {
        throw new Error("Failed to get access token");
    }
}
