async function fetchWebApi(endpoint, method, token, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method,
        
        body:JSON.stringify(body)
      });
    if (method = 'GET') {
          return await res.json();
    } 
    
  }


module.exports = { fetchWebApi };