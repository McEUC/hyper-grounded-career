from playwright.sync_api import sync_playwright

def verify_onboarding(page):
    # 1. Go to the Interview Dashboard
    page.goto("http://localhost:3000/dashboard/interview")

    # 2. Verify "Free Trial" vs "Deep Research" selection
    page.wait_for_selector("text=Standard Role")
    page.wait_for_selector("text=Deep Research")

    # Take a screenshot of the Mode Selection
    page.screenshot(path="verification/1_mode_selection.png")

    # 3. Click "Standard Role" (Free Mode)
    page.click("text=Standard Role")

    # 4. Verify Role Dropdown & Resume Input
    page.wait_for_selector("text=Select Role")
    page.wait_for_selector("text=Your Context")

    # Take a screenshot of the Input Screen
    page.screenshot(path="verification/2_input_screen.png")

    # 5. Enter Resume Text
    page.fill("textarea", "I am a junior PM with 2 years of experience.")

    # 6. Click Next
    page.click("text=Next: Configure Persona")

    # 7. Verify Configuration (Tone, Mode)
    page.wait_for_selector("text=Persona Vibe")
    page.wait_for_selector("text=Role Mode")

    # Select "Intense" and "Interviewer"
    page.click("text=Intense")

    # Take a screenshot of Config
    page.screenshot(path="verification/3_config_screen.png")

    # 8. Start Simulation (This will fail if backend is not mocked, but we check UI up to here)
    # We can mock the network request if needed, but UI verification is primary goal.

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_onboarding(page)
            print("Verification script completed successfully.")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
