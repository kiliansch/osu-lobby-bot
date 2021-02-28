require("dotenv").config()
const Banchojs = require("bancho.js")
const Regexes = require("bancho.js/lib/Multiplayer/BanchoLobbyRegexes")
const client = new Banchojs.BanchoClient({username: process.env.OSU_USER, password: process.env.OSU_PASS, apiKey: process.env.AUTH_TOKEN});

let lobby;
let playerList = [];

client.connect().then(async () => {
    console.log("Login successful!")

    // Create new lobby
    const channel = await client.createLobby("Autohost Bot Test")
    lobby = channel.lobby;

    const password = Math.random().toString(36).substring(8);
    await Promise.all([
        lobby.setPassword(password)
    ]);

    console.log(`Lobby created! Name: ${lobby.name}, Password: ${password}`)
    console.log(`Multiplayer Link: https://osu.ppy.sh/mp/${lobby.id}`)

    lobby.on("playerJoined", (obj) => {
        channel.sendMessage(`Hello there ${obj.player}`)

        if (obj.player.user.isClient()) {
            lobby.setHost(`#${obj.player.user.id}`)
        }

        playerList.push(obj.player.user.id)

        channel.sendMessage(`Hello there ${obj.player.user.username}`) */
    });

    lobby.on("slots", (obj) => {
        channel.sendMessage(`slots updated: ${obj}`)
        console.log(`slots updated: ${obj}`)
    })

    lobby.on("allPlayersReady", (obj) => {
        console.log(`All players ready.`);
        console.log(obj)
        console.log(playerList)
    })

    process.on("SIGINT", async () => {
        console.log("SIGINT received. Closing lobby and exiting...")

        await lobby.closeLobby();
        await client.disconnect();
    })
}).catch(console.error)