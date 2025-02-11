import time
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    contexts_and_pages = []
    for i in range(1, 10):
        username = f'DavidGengenbach{i}'
        password = '123456'
        contexts_and_pages.append(
            start_browser(playwright, username, password))

    contexts_and_pages[0][1].pause()


def start_browser(playwright: Playwright, username: str, password: str):
    browser = playwright.chromium.launch(
        headless=False,
        args=["--start-maximized"],
    )
    context = browser.new_context(
        permissions=['camera', 'microphone'],
        viewport=None,
        ignore_https_errors=True
    )
    page = context.new_page()
    page.route('**', lambda x: x.continue_())
    page.goto("https://workadventure.solidarity-world.de/~/maps/prototype_fund.wam")
    page.get_by_role("textbox", name="Username").click()
    page.get_by_role("textbox", name="Username").fill(username)
    page.get_by_role("textbox", name="Password").fill(password)
    page.get_by_role("button", name="Sign in").click()
    page.get_by_role("link", name="Continue").click()
    page.get_by_role("button", name="Let's go!").click()

    return context, page


with sync_playwright() as playwright:
    run(playwright)
