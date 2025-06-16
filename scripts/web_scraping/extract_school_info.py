import os
import argparse
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import json
import time
import re

def setup_driver():
    """Set up and return a configured Chrome WebDriver"""
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
    driver = webdriver.Chrome(options=chrome_options)
    
    # Block toast messages
    driver.execute_script("""
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            .toast, 
            [class*='toast'], 
            [id*='toast'] { 
                display: none !important; 
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important;
                z-index: -9999 !important;
            }
        `;
        document.head.appendChild(style);
    """)
    
    return driver

def read_institution_links():
    """Read links from program_links.txt, grouped by institution"""
    institutions = []
    current_institution = []
    
    try:
        with open('program_links.txt', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:  # Non-empty line
                    current_institution.append(line)
                elif current_institution:  # Empty line and we have links
                    institutions.append(current_institution)
                    current_institution = []
            
            # Don't forget the last institution if there's no empty line at the end
            if current_institution:
                institutions.append(current_institution)
                
    except FileNotFoundError:
        print("Error: program_links.txt not found")
        return []
        
    return institutions

def get_institution_name(driver, first_link):
    """Get institution name from the first link of an institution"""
    try:
        driver.get(first_link)
        # Wait for the course detail section to be present
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "CourseDetail")))
        
        # Get the location element which contains institution name
        location_element = driver.find_element(By.XPATH, '//*[@id="CourseDetail"]/div/div[1]/section[1]/div[1]/div[2]/div/div[2]/div[2]/div[2]/a')
        location_text = location_element.text.strip()
        # Get text before the pipe
        institution_name = location_text.split('|')[0].strip()
        return institution_name
    except Exception as e:
        print(f"Error getting institution name: {str(e)}")
        return None

def extract_course_details(driver, wait):
    """Extract course details using XPath selectors"""
    try:
        # Wait for the course detail section to be present
        wait.until(EC.presence_of_element_located((By.ID, "CourseDetail")))
        
        # Re-inject toast hiding CSS after page load
        driver.execute_script("""
            var style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = `
                .toast, 
                [class*='toast'], 
                [id*='toast'] { 
                    display: none !important; 
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    position: absolute !important;
                    z-index: -9999 !important;
                }
            `;
            document.head.appendChild(style);
        """)
        
        # Extract program name
        program_name_element = driver.find_element(By.XPATH, '//*[@id="CourseDetail"]/div/div[1]/section[1]/div[1]/div[2]/div/div[1]/h1')
        program_name = program_name_element.text.strip()
        
        # Extract field of study
        field_element = driver.find_element(By.XPATH, '//*[@id="CourseDetail"]/div/div[1]/section[1]/div[1]/div[2]/div/div[2]/div[2]/div[1]/a')
        field_of_study = field_element.text.strip()
        
        # Extract location (text after pipe)
        location_element = driver.find_element(By.XPATH, '//*[@id="CourseDetail"]/div/div[1]/section[1]/div[1]/div[2]/div/div[2]/div[2]/div[2]/a')
        location_text = location_element.text.strip()
        # Get text after the pipe
        location = location_text.split('|')[-1].strip()
        
        # Extract intakes
        intakes = []
        try:
            # Find the span with class "why-title" containing "Intakes"
            intakes_element = driver.find_element(By.XPATH, "//span[@class='why-title'][normalize-space(text())='Intakes']")
            # Find the following span with the months
            intakes_span = intakes_element.find_element(By.XPATH, "following-sibling::span[@class='f-default font-weight-semibold']")
            intakes_text = intakes_span.text.strip()
            # Split by spaces and filter out empty strings
            intakes = [month.strip() for month in intakes_text.split() if month.strip()]
        except NoSuchElementException:
            # Element not found, intakes will remain empty list
            pass
        except Exception as e:
            print(f"Error extracting intakes: {str(e)}")
        
        # Extract program duration
        program_duration_years = None
        try:
            duration_element = driver.find_element(By.XPATH, "//*[normalize-space(text())='Duration']")
            duration_span = duration_element.find_element(By.TAG_NAME, "span")
            duration_text = duration_span.text.strip()
            # Extract just the number from the beginning
            duration_match = re.match(r'^(\d+)', duration_text)
            if duration_match:
                program_duration_years = int(duration_match.group(1))
        except NoSuchElementException:
            # Element not found, program_duration_years will remain None
            pass
        except Exception as e:
            print(f"Error extracting duration: {str(e)}")

        # Extract internship
        internship = None
        try:
            # Look for element that contains exactly "Internship" (with possible spaces)
            internship_element = driver.find_element(By.XPATH, "//*[normalize-space(text())='Internship']")
            # Get the span element within it
            internship_span = internship_element.find_element(By.TAG_NAME, "span")
            internship = internship_span.text.strip()
        except NoSuchElementException:
            # Element not found, internship will remain None
            pass
        except Exception as e:
            print(f"Error extracting internship: {str(e)}")

        # Extract entry requirements
        entry_requirements = {}
        
        try:
            time.sleep(3)
            
            # Check for and click "See more requirements" button if it exists
            try:
                see_more_button = driver.find_element(By.XPATH, "//*[contains(text(), 'See more requirements')]")
                try:
                    see_more_button.click()
                    time.sleep(1)
                except:
                    # If any error occurs while clicking (including not interactable), just continue
                    pass
            except NoSuchElementException:
                # Button not found, continue with normal extraction
                pass
            
            # Find the entry-selection-inner element
            entry_selection = wait.until(
                EC.presence_of_element_located((By.CLASS_NAME, "entry-selection-inner"))
            )
            
            # Scroll entry-selection-inner into view
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", entry_selection)
            time.sleep(1)  # Wait for scroll to complete
            
            # Get all child elements except the last one
            child_elements = entry_selection.find_elements(By.XPATH, "./*[not(position()=last())]")
            
            # Process each child element
            for i in range(len(child_elements)):
                try:
                    # Re-find elements after each iteration
                    entry_selection = wait.until(
                        EC.presence_of_element_located((By.CLASS_NAME, "entry-selection-inner"))
                    )
                    
                    child_elements = entry_selection.find_elements(By.XPATH, "./*[not(position()=last())]")
                    
                    # Click the current element
                    child_elements[i].click()
                    time.sleep(1)  # Wait for content to load
                    
                    # Find the entry-selected element
                    entry_selected = wait.until(
                        EC.presence_of_element_located((By.CLASS_NAME, "entry-selected"))
                    )
                    
                    # Get the first child of entry-selected
                    first_child = entry_selected.find_element(By.XPATH, "./div[1]")
                    
                    # Get the second child within the first child
                    second_child = first_child.find_element(By.XPATH, "./div[2]")
                    
                    # Get all children of second_child except the last one
                    requirement_elements = second_child.find_elements(By.XPATH, "./*[not(position()=last())]")
                    
                    # Combine all text from requirement elements
                    combined_text = ""
                    for req_element in requirement_elements:
                        combined_text += req_element.text.strip() + " "
                    
                    # Split by colon to get key-value pair
                    if ':' in combined_text:
                        key, value = combined_text.split(':', 1)
                        entry_requirements[key.strip()] = value.strip()
                    
                    # Click the back button
                    back_button = driver.find_element(By.XPATH, "//a[contains(text(), 'Change Entry Requirements')]")
                    back_button.click()
                    time.sleep(1)  # Wait for selection screen to load
                    
                except Exception as e:
                    print(f"Error processing element {i}: {e}")
                    continue
                
        except Exception as e:
            print(f"Error in entry requirements extraction: {e}")

        # Extract fees
        fees = {
            "registration_fee": None,
            "resource_fee": None,
            "tuition_fee": None
        }
        
        try:
            fees_tab = wait.until(EC.presence_of_element_located((By.ID, "FeesTabLocal")))
            
            fee_elements = fees_tab.find_elements(By.XPATH, "./*[position() <= 3]")
            
            # Extract fees from each element
            for i, fee_type in enumerate(['registration_fee', 'resource_fee', 'tuition_fee']):
                fee_text = fee_elements[i].find_element(By.XPATH, "./div[2]").text.strip()
                if fee_text and fee_text != '-':
                    fee_text = fee_text.replace('MYR', '').strip()
                    fees[fee_type] = int(fee_text.replace(',', ''))
                
        except Exception as e:
            print(f"Error extracting fees: {str(e)}")

        # Extract English requirements
        english_requirements = {}
        try:
            # Look for element containing "English Requirements" text
            english_req_element = driver.find_element(By.XPATH, "//*[contains(text(), 'English Requirements')]")
            
            # Find the ul element that follows it
            ul_element = english_req_element.find_element(By.XPATH, "following-sibling::ul")
            
            # Get all li elements
            li_elements = ul_element.find_elements(By.TAG_NAME, "li")
            
            # Process each li element
            for li in li_elements:
                text = li.text.strip()
                if '-' in text:
                    key, value = text.split('-', 1)
                    english_requirements[key.strip()] = value.strip()
                
        except NoSuchElementException:
            # Element not found, english_requirements will remain empty
            pass
        except Exception as e:
            print(f"Error extracting English requirements: {str(e)}")

        # Extract course content
        course_content = {
            "core": "",
            "elective": "",
            "others": ""
        }
        
        try:
            # Extract core content
            core_tab = driver.find_element(By.ID, "ContentTabcore")
            core_text = ' '.join([elem.text.strip() for elem in core_tab.find_elements(By.XPATH, ".//*[text()]")])
            course_content["core"] = core_text.strip()
            
            # Extract elective content
            elective_tab = driver.find_element(By.ID, "ContentTabelective")
            elective_text = ' '.join([elem.text.strip() for elem in elective_tab.find_elements(By.XPATH, ".//*[text()]")])
            course_content["elective"] = elective_text.strip()
            
            # Extract others content
            others_tab = driver.find_element(By.ID, "ContentTabothers")
            others_text = ' '.join([elem.text.strip() for elem in others_tab.find_elements(By.XPATH, ".//*[text()]")])
            course_content["others"] = others_text.strip()
            
        except NoSuchElementException:
            # Element not found, that section will remain empty string
            pass
        except Exception as e:
            print(f"Error extracting course content: {str(e)}")
        
        # Create the data dictionary
        course_data = {
            "program_name": program_name,
            "field_of_study": field_of_study,
            "location": location,
            "intakes": intakes,
            "program_duration_years": program_duration_years,
            "internship": internship,
            "entry_requirements_raw": entry_requirements,
            "english_requirements": english_requirements,
            "fees": fees,
            "course_content": course_content
        }
        
        # Save to JSON file
        with open('course_details.json', 'w', encoding='utf-8') as f:
            json.dump(course_data, f, indent=4, ensure_ascii=False)
            
        print("Successfully extracted and saved course details!")
        return course_data
        
    except Exception as e:
        print(f"Error extracting course details: {e}")
        return None

def process_single_link(driver, wait, link):
    """Process a single program link and return the program details"""
    try:
        print(f"\nProcessing single link: {link}")
        driver.get(link)
        
        # Get institution name first
        institution_name = get_institution_name(driver, link)
        if not institution_name:
            print("Could not get institution name")
            return None
            
        print(f"Institution name: {institution_name}")
        
        # Extract program details
        program_details = extract_course_details(driver, wait)
        if not program_details:
            print("Failed to extract program details")
            return None
            
        # Save to course_details.json
        with open('course_details.json', 'w', encoding='utf-8') as f:
            json.dump(program_details, f, indent=4, ensure_ascii=False)
        print(f"\nSaved program details to course_details.json")
        return program_details
        
    except Exception as e:
        print(f"Error processing link: {str(e)}")
        return None

def process_batch(driver, wait, institutions, limit=None, start_index=0):
    """Process a batch of institutions starting from a specific index"""
    if start_index >= len(institutions):
        print(f"Start index {start_index} is out of range. Total institutions: {len(institutions)}")
        return
        
    # Apply start index
    institutions = institutions[start_index:]
    print(f"Starting from institution {start_index + 1} of {len(institutions) + start_index}")
    
    if limit:
        institutions = institutions[:limit]
        print(f"Processing {len(institutions)} institutions")
    
    try:
        for i, institution_links in enumerate(institutions, start_index + 1):
            if not institution_links:
                continue
                
            print(f"\nProcessing institution {i} of {len(institutions)}")
            print(f"Number of programs to process: {len(institution_links)}")
                
            # Get institution name from first link
            institution_name = get_institution_name(driver, institution_links[0])
            if not institution_name:
                print(f"Could not get institution name, skipping institution")
                continue
                
            print(f"Institution name: {institution_name}")
                
            # Create institution data structure
            institution_profile = {
                "institution_name": institution_name,
                "programs": []
            }
            
            # Process each program link
            for j, link in enumerate(institution_links, 1):
                try:
                    print(f"\nProcessing program {j} of {len(institution_links)}")
                    print(f"Link: {link}")
                    
                    # Clear browser state before processing each link
                    print("Clearing browser state...")
                    driver.delete_all_cookies()
                    driver.execute_script("window.localStorage.clear();")
                    driver.execute_script("window.sessionStorage.clear();")
                    
                    # Navigate to a blank page first
                    driver.get("about:blank")
                    time.sleep(1)
                    
                    # Now navigate to the actual link
                    driver.get(link)
                    
                    # Extract and save program details
                    program_details = extract_course_details(driver, wait)
                    if program_details:
                        institution_profile["programs"].append(program_details)
                        print(f"Successfully extracted program {j}")
                    else:
                        print(f"Failed to extract program {j}")
                        
                except Exception as e:
                    print(f"Error processing program {j}: {str(e)}")
                    continue
            
            # Save institution data
            if institution_profile["programs"]:
                # Convert institution name to filename (replace spaces with underscores)
                filename = institution_name.replace(' ', '_') + '.json'
                filepath = os.path.join('institution_profile', filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(institution_profile, f, indent=4, ensure_ascii=False)
                print(f"\nSaved data for {institution_name}")
                print(f"Number of programs saved: {len(institution_profile['programs'])}")
                
    except Exception as e:
        print(f"An error occurred: {e}")

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Scrape program details from unienrol.com')
    parser.add_argument('--mode', choices=['single', 'batch'], default='batch',
                      help='Mode to run in: single link or batch processing')
    parser.add_argument('--link', type=str,
                      help='Single link to process (required for single mode)')
    parser.add_argument('--limit', type=int,
                      help='Limit number of institutions to process in batch mode')
    parser.add_argument('--start-index', type=int, default=0,
                      help='Index of institution to start from in batch mode (0-based)')
    args = parser.parse_args()
    
    # Create institution_profile directory if it doesn't exist
    if not os.path.exists('institution_profile'):
        os.makedirs('institution_profile')
    
    # Set up the driver
    driver = setup_driver()
    wait = WebDriverWait(driver, 10)
    
    try:
        if args.mode == 'single':
            if not args.link:
                print("Error: --link argument is required for single mode")
                return
            process_single_link(driver, wait, args.link)
        else:  # batch mode
            institutions = read_institution_links()
            if not institutions:
                print("No links found in program_links.txt")
                return
            process_batch(driver, wait, institutions, args.limit, args.start_index)
            
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
