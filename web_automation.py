from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import re

USERNAME = "606724"
PASSWORD = "Test@1234"

SO_NO = 2200478902

VEHICLE_NUM = "MH18ba1258"

DESTINATION = "A"

WEIGHT = 5

PHONE_NUMBER = 8305678122

DRIVER_NAME = "shahzad kha"

LICENSE_NUM="9471"

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

    # Step 6: Search for SO number
    search_box = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "jqgid_globalSearch"))
    )
    search_box.clear()
    search_box.send_keys(str(SO_NO))
    search_box.send_keys(Keys.RETURN)
    print("✅ SO number searched successfully")
    
    # Wait for search results to load
    time.sleep(2)

    # Step 7: Find and click checkbox - Method 1 only
    print(f"🔍 Looking for checkbox with SO_NO = {SO_NO}")
    
    try:
        checkbox = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//input[starts-with(@id, 'OrderNo_{SO_NO}_')]"))
        )
        checkbox.click()
        print(f"✅ Clicked checkbox with SO_NO = {SO_NO}")
    except Exception as e:
        print("❌ Could not find checkbox for SO_NO. Debugging...")
        # Debug: Print available checkboxes
        checkboxes = driver.find_elements(By.XPATH, "//input[@type='checkbox']")
        print(f"Found {len(checkboxes)} checkboxes")
        for i, cb in enumerate(checkboxes[:5]):
            print(f"Checkbox {i}: ID = {cb.get_attribute('id')}")
        raise Exception(f"Could not find checkbox for SO_NO = {SO_NO}: {e}")

    # Step 8: Click the Commit button
    print("🔍 Looking for Commit button...")
    
    try:
        commit_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "commitBtnTOO"))
        )
        commit_btn.click()
        print("✅ Clicked Commit button by ID")
    except Exception as e:
        raise Exception(f"Could not find or click the Commit button by ID: {e}")

    # Step 9: Handle Two-Step Confirmation Process
    print("🔍 Handling two-step confirmation process...")
    
    # FIRST POP-UP: Confirmation popup
    print("⏳ Waiting for first confirmation popup...")
    try:
        WebDriverWait(driver, 10).until(EC.alert_is_present())
        alert1 = driver.switch_to.alert
        alert1_text = alert1.text
        print(f"📢 First Alert found: '{alert1_text}'")
        
        # Verify if the first popup contains the expected SO number
        # Expected format: 'Do you want to Commit these Order No's ?? 1. Order No : 2200478050_010-1-1'
        so_number_found = False
        
        # Use regex to find SO number patterns (with various suffixes)
        so_pattern = rf"{SO_NO}[_-]\d+[_-]\d+[_-]\d+"
        matches = re.findall(so_pattern, alert1_text)
        
        if matches:
            print(f"✅ FIRST CONFIRMATION: SO number found in format: {matches[0]}")
            so_number_found = True
        elif str(SO_NO) in alert1_text:
            print(f"✅ FIRST CONFIRMATION: SO number {SO_NO} found in alert")
            so_number_found = True
        else:
            print(f"⚠️ WARNING: SO number {SO_NO} not found in first confirmation popup")
        
        # Check if it's a confirmation dialog
        is_confirmation = any(keyword.lower() in alert1_text.lower() 
                            for keyword in ['do you want to commit', 'commit these order', 'confirm'])
        
        if is_confirmation and so_number_found:
            print("✅ First popup is valid confirmation dialog with correct SO number")
            alert1.accept()  # Click OK
            print("✅ First confirmation popup accepted")
        elif is_confirmation:
            print("⚠️ First popup is confirmation dialog but SO number verification unclear")
            alert1.accept()  # Click OK anyway
            print("⚠️ First confirmation popup accepted (with warning)")
        else:
            print("❌ First popup doesn't appear to be a confirmation dialog")
            alert1.accept()  # Click OK to proceed
            
    except Exception as e:
        print(f"❌ Error handling first popup: {e}")
        raise Exception("Failed to handle first confirmation popup")
    
    # Wait a moment between popups
    time.sleep(1)
    
    # SECOND POP-UP: Success confirmation popup
    print("⏳ Waiting for second success popup...")
    try:
        WebDriverWait(driver, 10).until(EC.alert_is_present())
        alert2 = driver.switch_to.alert
        alert2_text = alert2.text
        print(f"📢 Second Alert found: '{alert2_text}'")
        
        # Verify the second popup format
        # Expected format: "ORDER NO:2200478050_010_1, MESSAGE: ORDER COMMIT SUCCESS"
        
        # Extract SO number from the success message
        so_in_success = False
        success_message_found = False
        
        # Check for SO number in various formats
        so_patterns = [
            rf"ORDER NO:\s*{SO_NO}[_-]\d+[_-]\d+",
            rf"ORDER NO:\s*{SO_NO}[_\-\d]*",
            rf"{SO_NO}[_-]\d+[_-]\d+"
        ]
        
        extracted_so = None
        for pattern in so_patterns:
            matches = re.findall(pattern, alert2_text)
            if matches:
                extracted_so = matches[0]
                so_in_success = True
                break
        
        if not so_in_success and str(SO_NO) in alert2_text:
            so_in_success = True
            extracted_so = str(SO_NO)
        
        # Check for success message - exact format: "MESSAGE: ORDER COMMIT SUCCESS"
        success_message_found = "MESSAGE: ORDER COMMIT SUCCESS" in alert2_text
        
        # Final verification and logging
        if so_in_success and success_message_found:
            print("🎉 COMMIT OPERATION SUCCESSFUL!")
            print(f"   ✓ SO Number Verified: {extracted_so if extracted_so else SO_NO}")
            print(f"   ✓ Success Message Confirmed: MESSAGE: ORDER COMMIT SUCCESS")
            print(f"   ✓ Full Message: {alert2_text}")
            
            # Record the success
            success_record = {
                "so_number": SO_NO,
                "extracted_so": extracted_so,
                "success_message": alert2_text,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "status": "SUCCESS"
            }
            print(f"📋 Success Record: {success_record}")
            
        elif success_message_found:
            print("⚠️ SUCCESS MESSAGE found but SO number verification unclear")
            print(f"   Expected SO: {SO_NO}")
            print(f"   Message: {alert2_text}")
        else:
            print("❌ Second popup doesn't contain expected success message")
            print(f"   Expected: MESSAGE: ORDER COMMIT SUCCESS with SO {SO_NO}")
            print(f"   Actual: {alert2_text}")
        
        alert2.accept()  # Click OK on success popup
        print("✅ Second popup dismissed")
        
    except Exception as e:
        print(f"❌ Error handling second popup: {e}")
        # Check if maybe there's no second popup and the page has changed
        try:
            current_url = driver.current_url
            print(f"Current URL after first popup: {current_url}")
            
            # Look for success messages on the page itself
            success_elements = driver.find_elements(By.XPATH, 
                "//*[contains(text(), 'SUCCESS') or contains(text(), 'COMMIT') or contains(text(), 'success')]")
            
            if success_elements:
                for element in success_elements:
                    element_text = element.text.strip()
                    if element_text and str(SO_NO) in element_text:
                        print(f"📢 Success message found on page: '{element_text}'")
                        break
            
        except:
            pass
    
    # Step 10: Click on totalOrders radio button
    print("🔍 Step 10: Looking for totalOrders radio button...")
    try:
        total_orders_radio = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "totalOrders"))
        )
        total_orders_radio.click()
        print("✅ Step 10: Clicked totalOrders radio button")
    except Exception as e:
        print(f"❌ Step 10: Could not find or click totalOrders radio button: {e}")
        raise Exception(f"Step 10 failed: {e}")

    # Step 11: Click on commit_allocated radio button
    print("🔍 Step 11: Looking for commit_allocated radio button...")
    try:
        commit_allocated_radio = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "commit_allocated"))
        )
        commit_allocated_radio.click()
        print("✅ Step 11: Clicked commit_allocated radio button")
    except Exception as e:
        print(f"❌ Step 11: Could not find or click commit_allocated radio button: {e}")
        raise Exception(f"Step 11 failed: {e}")
    
    # Step 6 (again): Search for SO number
    search_box = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "jqgid_globalSearch"))
    )
    search_box.clear()
    search_box.send_keys(str(SO_NO))
    search_box.send_keys(Keys.RETURN)
    print("✅ SO number searched successfully")
    
    # Wait for search results to load
    time.sleep(2)
    
    # Step 12: Click on SplitOrder radio button with SO_NO in value
    print(f"🔍 Step 12: Looking for SplitOrder radio button with SO_NO {SO_NO}...")
    try:
        # Find radio button where value starts with SO_NO
        split_order_radio = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//input[@name='SplitOrder' and starts-with(@value, '{SO_NO}_')]"))
        )
        
        # Get the value to verify it contains the SO_NO
        radio_value = split_order_radio.get_attribute("value")
        print(f"   Found radio button with value: {radio_value}")
        
        # Verify SO_NO is at the beginning of the value
        if radio_value and radio_value.startswith(str(SO_NO)):
            split_order_radio.click()
            print(f"✅ Step 12: Clicked SplitOrder radio button with SO_NO {SO_NO}")
            print(f"   Radio button value: {radio_value}")
        else:
            raise Exception(f"Radio button value doesn't start with SO_NO {SO_NO}")
            
    except Exception as e:
        print(f"❌ Step 12: Could not find or click SplitOrder radio button with SO_NO {SO_NO}: {e}")
        raise Exception(f"Step 12 failed: {e}")
    

    # Step 13: Click on Place Vehicle button
    print("🔍 Step 13: Looking for Place Vehicle button...")
    try:
        place_vehicle_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "placeVehicleBtn"))
        )
        place_vehicle_btn.click()
        print("✅ Step 13: Clicked Place Vehicle button")
    except Exception as e:
        print(f"❌ Step 13: Could not find or click Place Vehicle button by ID: {e}")
        raise Exception(f"Step 13 failed: {e}")
    
     # Step: Check for refresh popup
    print(f"🔍 Step: Checking for refresh popup...")
    try:
        # Wait a moment for any popup to appear
        time.sleep(2)
        
        # Check for refresh popup
        try:
            # Wait for alert to be present (shorter timeout since it's optional)
            alert = WebDriverWait(driver, 3).until(EC.alert_is_present())
            alert_text = alert.text
            print(f"📱 Alert found: '{alert_text}'")
            
            # Check for the exact refresh popup message
            if "kindly refresh page once" in alert_text.lower():
                print("✅ Found 'kindly refresh page once' popup - clicking OK")
                alert.accept()  # Click OK
                print("✅ Clicked OK on refresh popup")

                print("🔍 Step 13 (AGAIN): Looking for Place Vehicle button...")
                try:
                    place_vehicle_btn = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.ID, "placeVehicleBtn"))
                    )
                    place_vehicle_btn.click()
                    print("✅ Step 13: Clicked Place Vehicle button")
                except Exception as e:
                    print(f"❌ Step 13: Could not find or click Place Vehicle button by ID: {e}")
                    raise Exception(f"Step 13 failed: {e}")


            else:
                print(f"⚠️ Found popup but not the expected refresh message: '{alert_text}'")
                alert.accept()  # Still accept it
                print("✅ Clicked OK on popup")
                
        except:
            print("ℹ️ No refresh popup found - continuing with code")
        
        print("✅ Step completed: Refresh popup check done")
        
    except Exception as e:
        print(f"❌ Step failed: Could not handle refresh popup: {e}")
        raise Exception(f"Refresh popup handling failed: {e}")
    

    
    # Step 14: Input vehicle number
    print(f"🔍 Step 14: Looking for vehicle number input field...")
    try:
        # Wait for element to be clickable (interactable)
        vehicle_input = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "vehicle_noo"))
        )

        vehicle_input.send_keys(VEHICLE_NUM)
        print(f"✅ Step 14: Entered vehicle number: {VEHICLE_NUM}")
    except Exception as e:
        print(f"❌ Step 14: Could not find or input vehicle number by ID: {e}")
        raise Exception(f"Step 14 failed: {e}")
    

   
    # Step 15: Enhanced driver name handling (handles both manual selection and auto-fill)
    print(f"🔍 Step 15: Looking for driver license input field...")
    try:
        # Wait for driver input field to be present
        driver_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "driverLicId"))
        )
        
        # Check if the field is readonly (auto-filled)
        is_readonly = driver_input.get_attribute("readonly")
        current_value = driver_input.get_attribute("value")
        
        print(f"   Driver input field status:")
        print(f"   - Is readonly: {is_readonly is not None}")
        print(f"   - Current value: '{current_value}'")
        
        if is_readonly is not None and current_value:
            # Field is auto-filled and readonly
            print(f"✅ Step 15: Driver field is auto-filled with: '{current_value}'")
            
            # Extract license number from the auto-filled value if it contains our LICENSE_NUM
            license_num_str = str(LICENSE_NUM)
            
            if license_num_str in current_value:
                print(f"✅ Auto-filled driver contains our LICENSE_NUM '{license_num_str}'")
                print(f"✅ Step 15: Using auto-filled driver: '{current_value}'")
            else:
                print(f"⚠️ Auto-filled driver '{current_value}' doesn't contain LICENSE_NUM '{license_num_str}'")
                print(f"⚠️ Step 15: Proceeding with auto-filled driver anyway")
            
            # No need to do anything else - the field is already filled
            driver_found = True
            
        else:
            # Field is not auto-filled, proceed with manual selection
            print("   Driver field is not auto-filled, proceeding with manual selection...")
            
            # Make sure the field is clickable for manual input
            driver_input = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "driverLicId"))
            )
            
            # Tokenize DRIVER_NAME into words
            driver_words = DRIVER_NAME.strip().split()
            print(f"   Driver name words: {driver_words}")
            
            driver_found = False
            
            # Try each word in DRIVER_NAME
            for word_index, word in enumerate(driver_words):
                if driver_found:
                    break
                    
                print(f"   Trying word {word_index + 1}: '{word}'")
                
                # Clear the input field
                driver_input.clear()
                time.sleep(0.5)
                
                # Type first 3 letters of the word one by one
                first_three = word[:3].upper()
                print(f"   Typing first 3 letters: '{first_three}'")
                
                for char in first_three:
                    driver_input.send_keys(char)
                    time.sleep(0.3)  # Small delay between characters
                
                # Look for dropdown options using the correct HTML structure
                try:
                    # Find autocomplete container
                    autocomplete_container = None
                    dropdown_options = []
                    
                    # Try to find the dropdown
                    selectors_to_try = [
                        (By.ID, "driverLicIdautocomplete-list")
                    ]
                    
                    for method_num, (by_type, selector) in enumerate(selectors_to_try, 1):
                        try:
                            print(f"   Trying method {method_num}: {by_type} = '{selector}'")
                            autocomplete_container = WebDriverWait(driver, 3).until(
                                EC.presence_of_element_located((by_type, selector))
                            )
                            print(f"   ✅ Found autocomplete container using method {method_num}")
                            break
                        except:
                            print(f"   Method {method_num} failed")
                            continue
                    
                    if autocomplete_container:
                        # Find dropdown options within the container
                        option_selectors = [
                            ".//div[input[@type='hidden']]"
                        ]
                        
                        for opt_method, opt_selector in enumerate(option_selectors, 1):
                            try:
                                dropdown_options = autocomplete_container.find_elements(By.XPATH, opt_selector)
                                if dropdown_options:
                                    print(f"   ✅ Found {len(dropdown_options)} options using option method {opt_method}")
                                    break
                                else:
                                    print(f"   Option method {opt_method} found 0 options")
                            except Exception as e:
                                print(f"   Option method {opt_method} failed: {e}")
                    
                    print(f"   Final result: Found {len(dropdown_options)} dropdown options")
                    
                    if not dropdown_options:
                        print(f"   No dropdown options found for word '{word}'")
                        continue
                    
                    # Check each dropdown option for LICENSE_NUM match
                    for i, option in enumerate(dropdown_options):
                        try:
                            option_text = option.text.strip()
                            print(f"   Option {i+1}: '{option_text}'")
                            
                            # Extract license number from option text (format: "NAME-LICENSE_NUMBER")
                            if '-' in option_text:
                                license_full = option_text.split('-')[-1].strip()
                                
                                # Get last 4 digits of the license number
                                if len(license_full) >= 4:
                                    last_4_digits = license_full[-4:]
                                    license_num_str = str(LICENSE_NUM)
                                    
                                    print(f"   License full: '{license_full}', Last 4 digits: '{last_4_digits}', Looking for: '{license_num_str}'")
                                    
                                    # Check if LICENSE_NUM matches exactly the last 4 digits
                                    if last_4_digits == license_num_str:
                                        print(f"   ✅ Found exact match! Last 4 digits '{last_4_digits}' == LICENSE_NUM '{license_num_str}'")
                                        print(f"   Selected option: '{option_text}'")
                                        
                                        # Click the matching option
                                        driver.execute_script("arguments[0].click();", option)
                                        driver_found = True
                                        break
                                    else:
                                        print(f"   No match: '{last_4_digits}' != '{license_num_str}'")
                                else:
                                    print(f"   License too short: '{license_full}'")
                            else:
                                print(f"   No dash found in option text")
                                
                        except Exception as e:
                            print(f"   Error reading option {i+1}: {e}")
                            continue
                    
                    if driver_found:
                        print(f"✅ Step 15: Successfully selected driver from dropdown")
                        break
                    else:
                        print(f"   No matching LICENSE_NUM found for word '{word}'")
                        
                except Exception as e:
                    print(f"   Error looking for autocomplete dropdown: {e}")
                    continue
        
        if not driver_found and not (is_readonly is not None and current_value):
            print(f"❌ Step 15: Could not find driver with LICENSE_NUM {LICENSE_NUM} in any dropdown")
            raise Exception(f"Driver with LICENSE_NUM {LICENSE_NUM} not found in dropdown")
        
        # Final verification - read the final value in the field
        final_value = driver_input.get_attribute("value")
        print(f"✅ Step 15 completed: Final driver value: '{final_value}'")
            
    except Exception as e:
        print(f"❌ Step 15: Error in driver selection process: {e}")
        raise Exception(f"Step 15 failed: {e}")
    

    # Step 16: Enhanced mobile number handling
    print(f"🔍 Step 16: Looking for mobile number input field...")
    try:
        mobile_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "mobile_no"))
        )
        
        # Check if field is readonly (auto-filled)
        is_readonly = mobile_input.get_attribute("readonly")
        current_value = mobile_input.get_attribute("value")
        
        if is_readonly is not None and current_value:
            # Field is auto-filled - use existing value
            print(f"✅ Step 16: Using auto-filled mobile number: '{current_value}'")
        else:
            # Field is empty - input manually
            mobile_input = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "mobile_no"))
            )
            mobile_input.clear()
            mobile_input.send_keys(str(PHONE_NUMBER))
            print(f"✅ Step 16: Entered mobile number: {PHONE_NUMBER}")
        
        print(f"✅ Step 16 completed")
            
    except Exception as e:
        print(f"❌ Step 16: Mobile number input failed: {e}")
        raise Exception(f"Step 16 failed: {e}")
    

    # Step 17: Input quantity with validation
    print(f"🔍 Step 17: Looking for qty input field...")
    try:
        # Wait for element to be clickable (interactable)

        # Get the text content from the labels and convert to float
        rem_veh_cc_text = driver.find_element(By.ID, "remVehCC").text
        rem_veh_cc = float(rem_veh_cc_text)
        print(f"Remaining Vehicle CC: {rem_veh_cc}")

        rem_qty_text = driver.find_element(By.ID, "remQty").text
        rem_qty = float(rem_qty_text)
        print(f"Remaining Qty: {rem_qty}") 

        # Check if both rem_qty and rem_veh_cc are >= (WEIGHT-5)
        weight_threshold = WEIGHT - 5
        print(f"Weight threshold (WEIGHT-5): {weight_threshold}")

        
        if rem_qty >= weight_threshold and rem_veh_cc >= weight_threshold:
            # Find the smallest of the three values and round down
            smallest_value = min(rem_qty, rem_veh_cc, WEIGHT)
            input_value = int(smallest_value)  # Round down to bottom integer
            
            print(f"✅ Condition met: Both remaining values >= {weight_threshold}")
            print(f"Smallest value among ({rem_qty}, {rem_veh_cc}, {WEIGHT}): {smallest_value}")
            print(f"Input value (rounded down): {input_value}")
            
            qty_input = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "qty"))
            )
            
            qty_input.send_keys(str(input_value))
            print(f"✅ Step 17: Entered Qty: {input_value}")
        else:
            print(f"❌ Condition not met:")
            print(f"   rem_qty ({rem_qty}) >= {weight_threshold}: {rem_qty >= weight_threshold}")
            print(f"   rem_veh_cc ({rem_veh_cc}) >= {weight_threshold}: {rem_veh_cc >= weight_threshold}")
            raise Exception(f"Step 17 failed: Insufficient remaining quantity or vehicle CC")
            
    except Exception as e:
        print(f"❌ Step 17: Could not find or input quantity: {e}")
        raise Exception(f"Step 17 failed: {e}")
    

    #interim step:

    try:
        ETA = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "ETADateTime"))
            )
        ETA.click()
        print("✅ Clicked ETA button")
        # Remove focus immediately after clicking
        # Click on the body element to remove focus
        body = driver.find_element(By.TAG_NAME, "body")
        body.click()
        print("✅ Clicked body to remove focus from ETA")
    except Exception as e:
        print(f"❌  Could not find or click eta button: {e}")

    try:
        driver.save_screenshot("details.png")
        print("📸 Details screenshot saved as 'details.png'")
    except:
        pass
    

    # Step 18: Click on submit button 1
    print("🔍 Step 18: Looking for submit button 1...")
    try:
        submit_btn1 = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "placeVehicleSubmit"))
        )
        submit_btn1.click()
        print("✅ Step 18: Clicked 1st submit button")
    except Exception as e:
        print(f"❌ Step 18: Could not find or click 1st submit button: {e}")
        raise Exception(f"Step 18 failed: {e}")
    
    #step 19:
    print("🔍 Step 19: Looking for submit button 2...")
    try:
        submit_btn2 = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "sublitLRDetails"))
        )
        submit_btn2.click()
        print("✅ Step 19: Clicked 2nd submit button")
    except Exception as e:
        print(f"❌ Step 19: Could not find or click 2nd submit button: {e}")
        raise Exception(f"Step 19 failed: {e}")
    

    # Step 20: Handle JS popup confirmation
    print(f"🔍 Step: Looking for confirmation popup...")
    try:
        # Wait a moment for popup to appear
        time.sleep(2)
        
        # Check for the specific confirmation popup
        try:
            # Wait for alert to be present
            alert = WebDriverWait(driver, 5).until(EC.alert_is_present())
            alert_text = alert.text
            print(f"📱 Alert found: '{alert_text}'")
            
            # Check if it's the expected confirmation message
            if "Confirm to Allocate Vehicle For This Order" in alert_text:
                print("✅ Found expected confirmation popup")
                alert.accept()  # Click OK
                print("✅ Clicked OK on confirmation popup")
            else:
                print(f"⚠️ Unexpected alert message: '{alert_text}'")
                alert.accept()  # Still accept it
                print("✅ Clicked OK on unexpected alert")
                
        except:
            print("❌ No confirmation popup found")
            raise Exception("Expected confirmation popup not found")
        
        
        print("✅ Step completed: Confirmation popup handled successfully")
        
    except Exception as e:
        print(f"❌ Step failed: Could not handle confirmation popup: {e}")
        raise Exception(f"Confirmation popup handling failed: {e}")
    




    # Final status check
    time.sleep(2)
    print("🔎 Final URL:", driver.current_url)
    print("🏁 All steps completed successfully")


except Exception as e:
    print("❌ Error occurred:", e)
    # Take screenshot on error for debugging
    try:
        driver.save_screenshot("error_screenshot.png")
        print("📸 Error screenshot saved as 'error_screenshot.png'")
    except:
        pass

finally:
    # Uncomment to close browser
    # driver.quit()
    print("🏁 Script execution completed")
    pass

