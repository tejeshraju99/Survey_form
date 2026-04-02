#!/usr/bin/env python3
"""
Backend API Testing for Price Survey Tool
Tests all endpoints as specified in the review request
"""

import requests
import json
import sys
from datetime import datetime
import urllib.parse

# Backend URL from frontend environment
BACKEND_URL = "https://rep-survey-tool.preview.emergentagent.com/api"

def test_get_states():
    """Test GET /api/states - Should return {"states": ["Texas", "Oklahoma"]}"""
    print("Testing GET /api/states...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/states")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        print(f"Response: {data}")
        
        expected_states = ["Texas", "Oklahoma"]
        if "states" not in data:
            print("❌ FAILED: Response missing 'states' key")
            return False
            
        if set(data["states"]) != set(expected_states):
            print(f"❌ FAILED: Expected states {expected_states}, got {data['states']}")
            return False
            
        print("✅ PASSED: States endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_get_regions_texas():
    """Test GET /api/regions/Texas - Should return regions for Texas state"""
    print("\nTesting GET /api/regions/Texas...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/regions/Texas")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        print(f"Response: {data}")
        
        expected_regions = ["Texas", "Texas West"]
        if "regions" not in data:
            print("❌ FAILED: Response missing 'regions' key")
            return False
            
        if set(data["regions"]) != set(expected_regions):
            print(f"❌ FAILED: Expected regions {expected_regions}, got {data['regions']}")
            return False
            
        print("✅ PASSED: Texas regions endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_get_regions_oklahoma():
    """Test GET /api/regions/Oklahoma - Should return regions for Oklahoma"""
    print("\nTesting GET /api/regions/Oklahoma...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/regions/Oklahoma")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        print(f"Response: {data}")
        
        expected_regions = ["Oklahoma"]
        if "regions" not in data:
            print("❌ FAILED: Response missing 'regions' key")
            return False
            
        if set(data["regions"]) != set(expected_regions):
            print(f"❌ FAILED: Expected regions {expected_regions}, got {data['regions']}")
            return False
            
        print("✅ PASSED: Oklahoma regions endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_get_counties_texas_texas():
    """Test GET /api/counties/Texas/Texas - Should return counties array for Texas/Texas region"""
    print("\nTesting GET /api/counties/Texas/Texas...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/counties/Texas/Texas")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        print(f"Response: {data}")
        
        expected_counties = ["Denton", "Cooke", "Wise"]
        if "counties" not in data:
            print("❌ FAILED: Response missing 'counties' key")
            return False
            
        if set(data["counties"]) != set(expected_counties):
            print(f"❌ FAILED: Expected counties {expected_counties}, got {data['counties']}")
            return False
            
        print("✅ PASSED: Texas/Texas counties endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_get_counties_texas_west():
    """Test GET /api/counties/Texas/Texas%20West - Should return counties for Texas West region"""
    print("\nTesting GET /api/counties/Texas/Texas%20West...")
    
    try:
        # URL encode the region name
        region_encoded = urllib.parse.quote("Texas West")
        response = requests.get(f"{BACKEND_URL}/counties/Texas/{region_encoded}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        print(f"Response: {data}")
        
        expected_counties = ["Archer", "Baylor", "Wichita Falls", "Wilbarger"]
        if "counties" not in data:
            print("❌ FAILED: Response missing 'counties' key")
            return False
            
        if set(data["counties"]) != set(expected_counties):
            print(f"❌ FAILED: Expected counties {expected_counties}, got {data['counties']}")
            return False
            
        print("✅ PASSED: Texas/Texas West counties endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_get_products_texas_texas():
    """Test GET /api/products/Texas/Texas - Should return products with unit costs organized by categories"""
    print("\nTesting GET /api/products/Texas/Texas...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/products/Texas/Texas")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if "products" not in data:
            print("❌ FAILED: Response missing 'products' key")
            return False
            
        products = data["products"]
        
        # Check if products are organized by categories
        expected_categories = ["24oz cans Budget", "32oz & 40oz Budget", "24oz cans Domestic"]
        for category in expected_categories:
            if category not in products:
                print(f"❌ FAILED: Missing category '{category}'")
                return False
                
        # Check if products have unit costs
        first_category = list(products.keys())[0]
        first_product = products[first_category][0]
        if "name" not in first_product or "unit_cost" not in first_product:
            print("❌ FAILED: Products missing 'name' or 'unit_cost' fields")
            return False
            
        print(f"✅ PASSED: Texas/Texas products endpoint working correctly - {len(products)} categories found")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_get_products_oklahoma():
    """Test GET /api/products/Oklahoma/Oklahoma - Should return Oklahoma-specific products with different unit costs"""
    print("\nTesting GET /api/products/Oklahoma/Oklahoma...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/products/Oklahoma/Oklahoma")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if "products" not in data:
            print("❌ FAILED: Response missing 'products' key")
            return False
            
        products = data["products"]
        
        # Check if products are organized by categories
        expected_categories = ["24oz cans Budget", "32oz & 40oz Budget", "24oz cans Domestic"]
        for category in expected_categories:
            if category not in products:
                print(f"❌ FAILED: Missing category '{category}'")
                return False
                
        # Check if unit costs are different from Texas (specifically Keystone Light)
        keystone_oklahoma = None
        if "24oz cans Budget" in products:
            for product in products["24oz cans Budget"]:
                if "Keystone Light 24oz cans" in product["name"]:
                    keystone_oklahoma = product["unit_cost"]
                    break
                    
        if keystone_oklahoma is None:
            print("❌ FAILED: Could not find Keystone Light 24oz cans in Oklahoma products")
            return False
            
        # Expected Oklahoma price is 1.99 vs Texas price of 2.03
        if keystone_oklahoma != 1.99:
            print(f"❌ FAILED: Expected Keystone Light unit cost 1.99 for Oklahoma, got {keystone_oklahoma}")
            return False
            
        print(f"✅ PASSED: Oklahoma products endpoint working correctly - {len(products)} categories found with different unit costs")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_post_survey():
    """Test POST /api/surveys - Create a survey"""
    print("\nTesting POST /api/surveys...")
    
    survey_data = {
        "date_of_survey": "07/16/2025",
        "account_manager": "Jane Smith",
        "account_name": "Corner Store ABC",
        "state": "Oklahoma",
        "region": "Oklahoma",
        "county": "Oklahoma",
        "products": [
            {
                "product_name": "Keystone Light 24oz cans",
                "unit_cost": 1.99,
                "retail_price": 2.49,
                "percent_difference": 25.13
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/surveys",
            json=survey_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code not in [200, 201]:
            print(f"❌ FAILED: Expected status 200/201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
            
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify the response contains the survey data
        required_fields = ["id", "date_of_survey", "account_manager", "account_name", "state", "region", "county", "products"]
        for field in required_fields:
            if field not in data:
                print(f"❌ FAILED: Response missing required field '{field}'")
                return False, None
                
        # Verify the survey data matches what we sent
        if data["account_manager"] != survey_data["account_manager"]:
            print(f"❌ FAILED: Account manager mismatch")
            return False, None
            
        if len(data["products"]) != len(survey_data["products"]):
            print(f"❌ FAILED: Products count mismatch")
            return False, None
            
        survey_id = data["id"]
        print(f"✅ PASSED: Survey created successfully with ID: {survey_id}")
        return True, survey_id
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False, None

def test_get_surveys():
    """Test GET /api/surveys - Should return all surveys including the newly created one"""
    print("\nTesting GET /api/surveys...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/surveys")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        print(f"Response: Found {len(data)} surveys")
        
        if not isinstance(data, list):
            print("❌ FAILED: Response should be a list of surveys")
            return False
            
        # Check if we have at least one survey (the one we just created)
        if len(data) == 0:
            print("❌ FAILED: No surveys found")
            return False
            
        # Verify survey structure
        first_survey = data[0]
        required_fields = ["id", "date_of_survey", "account_manager", "account_name", "state", "region", "county", "products"]
        for field in required_fields:
            if field not in first_survey:
                print(f"❌ FAILED: Survey missing required field '{field}'")
                return False
                
        print(f"✅ PASSED: Surveys list endpoint working correctly - {len(data)} surveys found")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_export_csv():
    """Test GET /api/surveys/export/csv - Should return CSV format data with all survey information"""
    print("\nTesting GET /api/surveys/export/csv...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/surveys/export/csv")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            return False
            
        # Check content type
        content_type = response.headers.get('content-type', '')
        if 'text/csv' not in content_type:
            print(f"❌ FAILED: Expected content-type 'text/csv', got '{content_type}'")
            return False
            
        # Check content disposition header
        content_disposition = response.headers.get('content-disposition', '')
        if 'attachment' not in content_disposition or 'filename' not in content_disposition:
            print(f"❌ FAILED: Missing or invalid content-disposition header: '{content_disposition}'")
            return False
            
        csv_content = response.text
        lines = csv_content.strip().split('\n')
        
        if len(lines) < 1:
            print("❌ FAILED: CSV content is empty")
            return False
            
        # Check CSV header
        header = lines[0]
        expected_columns = [
            "Survey ID", "Date of Survey", "Account Manager", "Account Name",
            "State", "Region", "County", "Product Name", "Unit Cost", 
            "Retail Price", "% Difference", "Created At"
        ]
        
        for column in expected_columns:
            if column not in header:
                print(f"❌ FAILED: Missing expected column '{column}' in CSV header")
                return False
                
        print(f"✅ PASSED: CSV export endpoint working correctly - {len(lines)} lines (including header)")
        print(f"CSV Header: {header}")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {str(e)}")
        return False

def test_404_endpoints():
    """Test 404 responses for invalid endpoints"""
    print("\nTesting 404 responses...")
    
    test_cases = [
        ("/regions/InvalidState", "Invalid state should return 404"),
        ("/counties/Texas/InvalidRegion", "Invalid region should return 404"),
        ("/products/InvalidState/InvalidRegion", "Invalid state/region should return 404")
    ]
    
    all_passed = True
    
    for endpoint, description in test_cases:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}")
            if response.status_code != 404:
                print(f"❌ FAILED: {description} - Expected 404, got {response.status_code}")
                all_passed = False
            else:
                print(f"✅ PASSED: {description}")
        except Exception as e:
            print(f"❌ FAILED: {description} - Exception: {str(e)}")
            all_passed = False
            
    return all_passed

def main():
    """Run all backend API tests"""
    print("=" * 60)
    print("PRICE SURVEY TOOL - BACKEND API TESTING")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    tests = [
        ("States Endpoint", test_get_states),
        ("Texas Regions Endpoint", test_get_regions_texas),
        ("Oklahoma Regions Endpoint", test_get_regions_oklahoma),
        ("Texas/Texas Counties Endpoint", test_get_counties_texas_texas),
        ("Texas/Texas West Counties Endpoint", test_get_counties_texas_west),
        ("Texas/Texas Products Endpoint", test_get_products_texas_texas),
        ("Oklahoma Products Endpoint", test_get_products_oklahoma),
        ("Create Survey Endpoint", test_post_survey),
        ("List Surveys Endpoint", test_get_surveys),
        ("Export CSV Endpoint", test_export_csv),
        ("404 Error Handling", test_404_endpoints)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if test_name == "Create Survey Endpoint":
                result, survey_id = test_func()
            else:
                result = test_func()
                
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ FAILED: Unexpected error in {test_name} - {str(e)}")
            failed += 1
    
    print("\n" + "=" * 60)
    print("TESTING SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"❌ {failed} TESTS FAILED")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)