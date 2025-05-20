from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

USERNAME = "606724"
PASSWORD = "Test@1234"

SO_NO=12345678

HEADLESS = False

options = Options()
if HEADLESS:
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")

driver = webdriver.Chrome(options=options)

try:
    # Step 1: Open login page
    driver.get("https://dfpcl.autoplant.in/AutoplantVC/transporter_report.do?method=getTransporterReport&status=planned")
    print("🌐 Opened login page")

    # Step 2: Log in
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "username")))
    driver.find_element(By.NAME, "username").send_keys(USERNAME)
    driver.find_element(By.NAME, "password").send_keys(PASSWORD + Keys.RETURN)
    print("🔐 Login submitted")

    # Step 3: Wait until sidebar toggle appears
    # Wait for sidebar toggle to appear
    toggle = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "sidebar-toggle"))
)

# Scroll into view and click via JS
    driver.execute_script("arguments[0].scrollIntoView(true);", toggle)
    print("📂 Sidebar toggle clicked via JS")


    # Step 4: Click 'Vendor Collaboration'
    dropdown = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.LINK_TEXT, "Vendor Collaboration"))
    )
    dropdown.click()
    print("✅ Clicked 'Vendor Collaboration'")


    # Step 5: Click 'Available Orders Report'
    report_link = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.LINK_TEXT, "Available Orders Report"))
    )
    report_link.click()
    print("✅ Clicked 'Available Orders Report'")

    #step6:
    driver.find_element(By.ID, "jqgid_globalSearch").send_keys(SO_NO)
    print("✅ so. number searched successfully")


    # Step 7: Wait briefly and log final URL
    time.sleep(2)
    print("🔎 Current URL:", driver.current_url)

    # Optional: Screenshot for verification
    #driver.save_screenshot("final_view.png")

    

except Exception as e:
    print("❌ Error occurred:", e)

##finally:
  ##  driver.quit()
