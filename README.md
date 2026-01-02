# Creative Game

This is the repository for the Creative Game website.

## Features

*   **Game Library:** A central page to display and play games.
*   **User Accounts:** Pages for user login and game uploads.
*   **Social Sharing:** Game pages are set up with Open Graph meta tags for rich previews on social media.

**Note:** This repository contains the frontend implementation for the website. The backend functionality for user authentication and game uploads will need to be implemented separately.

## How to add a new game (manually)

To add a new game to the website manually, follow these steps:

1.  **Create a new directory for your game** inside the `games` directory. The name of the directory will be used in the URL for the game. For example, if you create a directory named `my-cool-game`, the URL will be `https://<your-domain>/games/my-cool-game/`.

2.  **Copy the contents of the `sample-game` directory** into your new game's directory. This will give you a template to work with.

3.  **Replace the `thumbnail.png` file** in the `images` directory with a thumbnail for your game. The recommended size is 1200x630 pixels.

4.  **Edit the `index.html` file** in your new game's directory and update the following:
    *   The `<title>` tag with the name of your game.
    *   The `og:title` meta tag with the name of your game.
    *   The `og:description` meta tag with a short description of your game.
    *   The `og:url` meta tag with the correct URL for your game.
    *   The content of the `<body>` with your game's content.

5.  **Add a link to your new game** on the main `index.html` file in the root of the repository. Add a new list item to the `<ul>` with a link to your new game's directory.
