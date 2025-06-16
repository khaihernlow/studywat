from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
import time

def wait_for_loading_to_complete(driver, wait):
    """Wait for any loading indicators to disappear and content to stabilize"""
    try:
        # Wait for loading indicator to disappear
        wait.until_not(EC.presence_of_element_located((By.CLASS_NAME, "loading")))
    except:
        pass  # Ignore if no loading indicator
    
    # Reduced wait time
    time.sleep(1)

def scroll_to_element(driver, element):
    """Scroll element into view smoothly"""
    driver.execute_script("""
        arguments[0].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    """, element)
    time.sleep(2)  # Wait for scroll to complete

def scroll_a_bit_more(driver, element):
    """Scroll a bit more to trigger next batch of content"""
    try:
        # Find the footer-top element
        footer = driver.find_element(By.CLASS_NAME, "footer-top")
        
        # Scroll it into view
        driver.execute_script("""
            arguments[0].scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        """, footer)
        
        time.sleep(1)
    except NoSuchElementException:
        print("Footer not found, trying alternative scroll...")
        # If footer not found, try scrolling the courses-listing
        driver.execute_script("""
            arguments[0].scrollTo(0, arguments[0].scrollHeight);
        """, element)
        time.sleep(1)

def scrape_course_links(driver, wait, university_name):
    """Scrape all course links from a university page"""
    all_links = set()
    previous_count = 0
    no_new_links_count = 0
    
    # Wait for courses listing to be present
    courses_listing = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "courses-listing")))
    
    # Reduced initial wait
    time.sleep(2)
    
    # First scroll to the courses-listing element
    print(f"Scrolling to courses listing for {university_name}...")
    scroll_to_element(driver, courses_listing)
    time.sleep(1)  # Reduced wait
    
    while True:
        # Find all course links
        course_links = courses_listing.find_elements(By.TAG_NAME, "a")
        
        # Add new links to our set
        for link in course_links:
            href = link.get_attribute('href')
            if href:
                all_links.add(href)
        
        # If we found new links, print the count
        if len(all_links) > previous_count:
            print(f"Found {len(all_links)} links so far for {university_name}...")
            previous_count = len(all_links)
            no_new_links_count = 0
        else:
            no_new_links_count += 1
        
        # Get the last link element
        if course_links:
            last_link = course_links[-1]
            
            # Scroll the last link into view quickly
            driver.execute_script("""
                arguments[0].scrollIntoView({
                    behavior: 'auto',
                    block: 'end'
                });
            """, last_link)
            
            # Reduced wait time
            time.sleep(2)
            wait_for_loading_to_complete(driver, wait)
            
            # Scroll a bit more to trigger next batch
            scroll_a_bit_more(driver, courses_listing)
        
        # If we haven't found new links in 3 attempts, we're probably at the bottom
        if no_new_links_count >= 3:
            # Reduced final wait
            time.sleep(2)
            final_links = courses_listing.find_elements(By.TAG_NAME, "a")
            for link in final_links:
                href = link.get_attribute('href')
                if href:
                    all_links.add(href)
            break
    
    return all_links

def scrape_universities():
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
    
    # Initialize the Chrome WebDriver
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 5)  # Reduced timeout to 5 seconds
    
    try:
        # Navigate to the universities page
        url = "https://unienrol.com/universities"
        driver.get(url)
        
        # Wait for the results listing to load
        results_listing = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "results-listing-courses")))
        
        # Open file to append links
        with open('program_links.txt', 'a', encoding='utf-8') as f:
            university_index = 62  # Start from the first university
            while True:
                try:
                    # Get all university items
                    university_items = results_listing.find_elements(By.CLASS_NAME, "course-item")
                    
                    # Check if we've processed all universities
                    if university_index >= len(university_items):
                        break
                    
                    # Get the current university item
                    university_item = university_items[university_index]
                    
                    # Find the first div inside course-item
                    first_div = university_item.find_element(By.TAG_NAME, "div")
                    
                    # Find the course-box element inside the first div
                    course_box = first_div.find_element(By.CLASS_NAME, "course-box")
                    
                    # Find the first link in the course-box
                    first_link = course_box.find_element(By.TAG_NAME, "a")
                    link_url = first_link.get_attribute('href')
                    university_name = first_link.text.strip()
                    
                    print(f"\nProcessing {university_name}...")
                    print("Found link:", link_url)
                    
                    # Use JavaScript to navigate to the URL
                    driver.execute_script(f"window.location.href = '{link_url}'")
                    
                    # Wait for URL to change
                    wait.until(lambda driver: driver.current_url != url)
                    
                    # Scrape all course links
                    course_links = scrape_course_links(driver, wait, university_name)
                    
                    # Write links to file
                    for link in sorted(course_links):
                        f.write(f"{link}\n")
                    f.write("\n")  # Empty line between universities
                    f.flush()  # Ensure content is written to disk immediately
                    
                    # Go back to universities page
                    driver.get(url)
                    time.sleep(1)  # Reduced wait time
                    
                    # Wait for the results listing to load again
                    results_listing = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "results-listing-courses")))
                    
                    # Move to next university
                    university_index += 1
                    
                except Exception as e:
                    print(f"Error processing university: {e}")
                    university_index += 1  # Move to next university even if there's an error
                    continue
        
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_universities()
