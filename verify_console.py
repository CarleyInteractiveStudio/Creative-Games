import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time

async def run():
    # Start the server
    server = subprocess.Popen(["python3", "-m", "http.server", "8000"])
    time.sleep(2) # Wait for server to start

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1280, "height": 720})

        # 1. Load console.html
        await page.goto("http://localhost:8000/console.html")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="console_redesign_initial.png")

        # 2. Scroll down to see more games
        await page.keyboard.press("ArrowDown")
        await page.wait_for_timeout(500)
        await page.screenshot(path="console_redesign_games.png")

        # 3. Open Details Panel
        # From games, go down to info bar
        # We are at row 1. Go down to row 2... until info bar.
        # Let's just press Down many times.
        for _ in range(5):
            await page.keyboard.press("ArrowDown")
            await page.wait_for_timeout(100)

        # Now we should be in info bar.
        # Press Right to select "Más detalles" (last button)
        for _ in range(4):
            await page.keyboard.press("ArrowRight")
            await page.wait_for_timeout(100)

        await page.keyboard.press("Enter")
        await page.wait_for_timeout(500)
        await page.screenshot(path="console_redesign_details.png")

        # Close details
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)

        # 4. Open Keyboard
        # Go up to header
        for _ in range(10):
            await page.keyboard.press("ArrowUp")
            await page.wait_for_timeout(100)

        await page.keyboard.press("Enter") # Search is first button in header
        await page.wait_for_timeout(500)
        await page.screenshot(path="console_redesign_keyboard.png")

        await browser.close()

    server.terminate()

if __name__ == "__main__":
    asyncio.run(run())
