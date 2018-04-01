require('dotenv').config();
const express = require('express'),
    http = require('http'),
    app = express(),
    session = require('express-session'),
    {
        google
    } = require('googleapis'),
    oAuth2 = google.auth.OAuth2,
    plus = google.plus('v1'),
    morgan = require('morgan'),
    clientId = process.env.clientId,
    clientSecret = process.env.clientSecret,
    redirectionUrl = process.env.redirectionUrl;


// configure session
app.use(session({
    secret: 'your-random-secret-19890913007',
    resave: true,
    saveUninitialized: true
}));


function getOAuthClient() {
    return new oAuth2(clientId, clientSecret, redirectionUrl);
}

function getAuthUrl() {
    var oauth2Client = getOAuthClient();
    // generate a url that asks permissions for Google+ 
    var scopes = [
        'https://www.googleapis.com/auth/plus.me',
    ];

    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes // If you only need one scope you can pass it as string
    });

    return url;
}

app.use(morgan('combined'))


app.get("/", (req, res) => {
    let url = getAuthUrl();
    res.send(`
        <h1>Authentication using google oAuth</h1>
        <a href=${url}> Login</a>
    `)
});



app.get("/oauth2callback", async (req, res) => {
    let oauth2Client = getOAuthClient();
    let session = req.session;
    let code = req.query.code; // the query param code
    try {
        let tokens = await oauth2Client.getToken(code); // get access tokens
        console.log(tokens.tokens)
        oauth2Client.setCredentials(tokens.tokens);
        //saving the token to current session
        session["tokens"] = tokens.tokens;
        res.send(`<h1>Login successful!!</h1>
            <a href="/details">Go to details page</a>
        `);
    } catch (err) {
        console.log(err);
        return res.send('Login failed')
    }
});

app.get("/details", (req, res) => {
    let oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(req.session["tokens"]);
    var p = new Promise((resolve, reject) => {
        plus.people.get({
            userId: 'me',
            auth: oauth2Client
        }, function (err, response) {
            resolve(response || err);
        });
    }).then((data) => {
        console.log(data)
        res.send(`
            <img src="${data.data.image.url}">
            <h3>Hello ${data.data.displayName}</h3>
        `);
    }).catch((err) => {
        console.log(err);
        res.send('Something broke!')
    })

});


app.set('port', 3000);
const server = http.createServer(app);
server.listen(app.get('port'));
server.on('listening', function () {
    console.log(`listening to ${app.get('port')}`);
});