document.addEventListener('DOMContentLoaded', handleCallback);
//var redirect_uri = 'http://localhost:5173/callback';
var redirect_uri = `https://better-spotify-recs.vercel.app/callback`; 

const client_id = __CLIENT_ID__;
const client_secret = __CLIENT_SECRET__;

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
    let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

  

async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = getCookie(stateKey);

    if (!state || state !== storedState) {
        document.getElementById("loading-text").innerHTML = "Error connecting to Spotify. Please try refreshing or clearing your cookies.";
        throw new Error("state mismatch");
    }

    document.cookie = `${stateKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

    const data = await requestToken(code);
    document.cookie = `signedIn=true; path=/`;
    console.log("Signed in");
    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
    
    if (data.access_token && data.refresh_token) {
        document.cookie = `signedIn=true; path=/`;
        console.log("Signed in");
        
        window.location.href = '/#' + new URLSearchParams({
            access_token: data.access_token,
            refresh_token: data.refresh_token
        }).toString();
    } else {
        window.location.href = '/#' + new URLSearchParams({
            error: 'invalid_token'
        }).toString();
    }

}
