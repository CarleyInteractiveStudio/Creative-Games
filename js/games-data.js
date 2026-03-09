const gamesData = [
    {
        id: 1,
        title: "Sample Game 1",
        description: "An exciting adventure waiting for you. Explore vast lands and uncover hidden secrets in this epic journey.",
        thumbnail: "games/sample-game/images/thumbnail.png",
        stars: 4.5,
        likes: 120,
        platforms: ["pc", "console"]
    },
    {
        id: 2,
        title: "Sample Game 2",
        description: "A fast-paced action game that will keep you on the edge of your seat. Test your reflexes and skills.",
        thumbnail: "games/sample-game/images/thumbnail.png",
        stars: 4.0,
        likes: 85,
        platforms: ["mobile"]
    },
    {
        id: 3,
        title: "Sample Game 3",
        description: "Strategy and tactics are key in this challenging puzzle game. Can you solve all the levels?",
        thumbnail: "games/sample-game/images/thumbnail.png",
        stars: 4.8,
        likes: 200,
        platforms: ["pc", "tv"]
    },
    {
        id: 4,
        title: "Sample Racing Game",
        description: "Feel the speed in the most realistic racing simulator ever created. Drive legendary cars on famous tracks.",
        thumbnail: "games/sample-game/images/thumbnail.png",
        stars: 4.2,
        likes: 150,
        platforms: ["pc", "console"]
    },
    {
        id: 5,
        title: "Dungeon Crawler",
        description: "Explore dark dungeons, fight monsters, and collect loot. A classic RPG experience for everyone.",
        thumbnail: "games/sample-game/images/thumbnail.png",
        stars: 4.7,
        likes: 310,
        platforms: ["pc", "console"]
    },
    {
        id: 6,
        title: "Puzzle Master",
        description: "Test your brain with hundreds of unique puzzles. Simple to learn, hard to master.",
        thumbnail: "games/sample-game/images/thumbnail.png",
        stars: 4.3,
        likes: 95,
        platforms: ["mobile", "pc"]
    }
];

// If we are in a browser environment, export it or attach to window
if (typeof window !== 'undefined') {
    window.gamesData = gamesData;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = gamesData;
}
