from pathlib import Path
import csv
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import io

BASE_DIR = Path(__file__).resolve().parent

# ============= Load Customers CSV =============
CUSTOMERS_DATA = []

try:
    with open(BASE_DIR / "customers.csv", newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            clean_row = {k.strip(): v.strip() if v else '' for k, v in row.items()}
            CUSTOMERS_DATA.append(clean_row)
    print(f"✅ Customers CSV loaded: {len(CUSTOMERS_DATA)} records")
except Exception as e:
    print("❌ Error loading customers.csv:", str(e))
    CUSTOMERS_DATA = []

# ============= App Setup =============
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= LOCATION DATA =============
LOCATION_DATA = {
    "Texas": {
        "Texas Central": {
            "counties": ["Denton", "Cooke", "Wise"],
            "products": {
                "24oz cans Budget": [
                    {"name": "Keystone Light 24oz cans", "unit_cost": 2.03},
                    {"name": "Steel Reserve 24oz cans", "unit_cost": 2.03},
                    {"name": "Steel Reserve Flavor 24oz cans", "unit_cost": 2.03},
                    {"name": "Lone Star 24oz cans", "unit_cost": 2.03},
                    {"name": "Pabst 24oz cans", "unit_cost": 2.03},
                    {"name": "Natural Light 25oz cans", "unit_cost": 2.03},
                    {"name": "Busch 25oz cans", "unit_cost": 2.03},
                    {"name": "Bud Ice 25oz cans", "unit_cost": 2.03},
                ],
                "32oz & 40oz Budget": [
                    {"name": "MHL 32oz can", "unit_cost": 2.31},
                    {"name": "MHL 32oz bottle", "unit_cost": 2.31},
                    {"name": "Mil Best 32oz Crusher", "unit_cost": 2.52},
                    {"name": "Mickeys 40oz", "unit_cost": 2.52},
                    {"name": "MHL 40oz", "unit_cost": 2.47},
                    {"name": "Steel Reserve 40oz", "unit_cost": 2.49},
                    {"name": "Bud Ice 40oz", "unit_cost": 2.49},
                ],
                "24oz cans Domestic": [
                    {"name": "Miller Lite 24oz cans", "unit_cost": 3.49},
                    {"name": "Coors Light 24oz cans", "unit_cost": 2.74},
                    {"name": "Coors Banquet 24oz cans", "unit_cost": 2.74},
                    {"name": "Bud Light 25oz cans", "unit_cost": 2.74},
                    {"name": "Budweiser 25oz cans", "unit_cost": 2.53},
                ],
                "32oz High End": [
                    {"name": "Corona Familiar", "unit_cost": 2.44},
                    {"name": "Michelob Ultra 24oz", "unit_cost": 2.74},
                ],
                "24oz High End": [
                    {"name": "Modelo Family", "unit_cost": 8.55},
                    {"name": "Corona Family", "unit_cost": 9.23},
                    {"name": "Dos Equis Family", "unit_cost": 9.23},
                    {"name": "Heineken", "unit_cost": 9.00},
                    {"name": "Michelob Ultra", "unit_cost": 9.94},
                ],
                "24oz High End and Flavor": [
                    {"name": "Twisted Tea Family 24oz cans", "unit_cost": 8.58},
                    {"name": "Smirnoff Family 23.5oz", "unit_cost": 16.78},
                    {"name": "Mike's Family 23.5oz", "unit_cost": 16.00},
                    {"name": "4 Loko 24oz cans", "unit_cost": 16.00},
                    {"name": "Cayman 24oz cans", "unit_cost": 16.00},
                    {"name": "Club Tails 24oz cans", "unit_cost": 16.00},
                    {"name": "Monster 24oz cans", "unit_cost": 13.60},
                ],
                "19.2oz High End and Flavor": [
                    {"name": "New Belgium Revolver", "unit_cost": 14.43},
                    {"name": "Angry Orchard", "unit_cost": 17.60},
                    {"name": "White Claw", "unit_cost": 18.55},
                    {"name": "Cayman Jacked", "unit_cost": 22.70},
                ],
                "Domestic 6pk 12oz": [
                    {"name": "Miller Lite 6pk bottles", "unit_cost": 12.40},
                    {"name": "Coors Light 6pk bottles", "unit_cost": 14.40},
                    {"name": "Coors Banquet 6pk bottles", "unit_cost": 14.43},
                    {"name": "Bud Light 6pk bottles", "unit_cost": 17.60},
                    {"name": "Budweiser 6pk bottles", "unit_cost": 18.55},
                ],
                "Import and High End 6pk": [
                    {"name": "Modelo 6pk bottles", "unit_cost": 21.50},
                    {"name": "Corona Extra 6pk bottles", "unit_cost": 21.50},
                    {"name": "Dos Equis 6pk bottles", "unit_cost": 21.50},
                    {"name": "Heineken 6pk bottles", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 6pk bottles", "unit_cost": 21.50},
                    {"name": "Modelo 6pk cans", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 6pk 16oz cans", "unit_cost": 21.50},
                    {"name": "Flight 6pk 16oz cans", "unit_cost": 21.50},
                ],
                "6pk bottle Flavor": [
                    {"name": "Smirnoff", "unit_cost": 21.50},
                    {"name": "Mikes", "unit_cost": 21.50},
                    {"name": "Topo Chico", "unit_cost": 21.50},
                    {"name": "Cayman Jack", "unit_cost": 21.50},
                    {"name": "White Claw", "unit_cost": 21.50},
                ],
                "12pk Import & High End": [
                    {"name": "Modelo Especial 12pk bottles", "unit_cost": 21.50},
                    {"name": "Modelo Chelada 12pk cans", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 12pk bottles", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 12pk cans", "unit_cost": 21.50},
                    {"name": "Modelo 12pk cans", "unit_cost": 21.50},
                    {"name": "Corona Premier 12pk cans", "unit_cost": 21.50},
                    {"name": "Dos Equis 12pk cans", "unit_cost": 21.50},
                    {"name": "Heineken 12pk cans", "unit_cost": 21.50},
                    {"name": "Flight 12pk cans", "unit_cost": 21.50},
                ],
                "Domestic 12pk 12oz and 9pk 16oz": [
                    {"name": "Miller Lite 12pk 12oz cans", "unit_cost": 10.00},
                    {"name": "Coors Light 12pk 12oz cans", "unit_cost": 10.00},
                    {"name": "Coors Banquet 12pk 12oz cans", "unit_cost": 10.00},
                    {"name": "Yuengling Lager 12pk 12oz cans", "unit_cost": 10.00},
                    {"name": "Miller Lite 9pk 16oz", "unit_cost": 12.20},
                    {"name": "Coors Light 9pk 16oz", "unit_cost": 12.20},
                    {"name": "Bud Light 12pk 12oz cans", "unit_cost": 12.20},
                    {"name": "Budweiser 12pk 12oz cans", "unit_cost": 12.20},
                ],
                "Domestic 12pk 16oz cans": [
                    {"name": "Miller Lite 12pk 16oz cans", "unit_cost": 14.35},
                    {"name": "Coors Light 12pk 16oz cans", "unit_cost": 17.80},
                    {"name": "Coors Banquet 12pk 16oz cans", "unit_cost": 14.35},
                    {"name": "Bud Light 12pk 16oz cans", "unit_cost": 14.35},
                    {"name": "Budweiser 12pk 16oz cans", "unit_cost": 20.90},
                ],
                "15pk and 18pk": [
                    {"name": "Miller Lite 18pk 12oz cans", "unit_cost": 18.00},
                    {"name": "Coors Light 18pk 12oz cans", "unit_cost": 18.00},
                    {"name": "Miller Lite 15pk 16oz alum pint", "unit_cost": 21.55},
                    {"name": "Coors Light 15pk 16oz alum pint", "unit_cost": 21.55},
                    {"name": "Bud Light 18pk 12oz cans", "unit_cost": 21.55},
                    {"name": "Budweiser 18pk 12oz cans", "unit_cost": 21.50},
                    {"name": "Modelo 18pk 12oz cans", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 18pk 12oz cans", "unit_cost": 21.50},
                ],
                "15pk and 18pk Budget": [
                    {"name": "Keystone Light 15pk 12oz cans", "unit_cost": 2.03},
                    {"name": "Natural Light 15pk 12oz cans", "unit_cost": 2.03},
                    {"name": "Busch Light 18pk 12oz cans", "unit_cost": 2.03},
                ],
            }
        },
        "Texas West": {
            "counties": ["Archer", "Baylor", "Wichita Falls", "Wilbarger"],
            "products": {
                "24oz cans Budget": [
                    {"name": "Keystone Light 24oz cans", "unit_cost": 2.03},
                    {"name": "Steel Reserve 24oz cans", "unit_cost": 2.03},
                    {"name": "Steel Reserve Flavor 24oz cans", "unit_cost": 2.03},
                    {"name": "Lone Star 24oz cans", "unit_cost": 2.03},
                    {"name": "Pabst 24oz cans", "unit_cost": 2.03},
                    {"name": "Natural Light 25oz cans", "unit_cost": 2.03},
                    {"name": "Busch 25oz cans", "unit_cost": 2.03},
                    {"name": "Bud Ice 25oz cans", "unit_cost": 2.03},
                ],
                "32oz & 40oz Budget": [
                    {"name": "MHL 32oz can", "unit_cost": 2.31},
                    {"name": "MHL 32oz bottle", "unit_cost": 2.31},
                    {"name": "Mil Best 32oz Crusher", "unit_cost": 2.52},
                    {"name": "Mickeys 40oz", "unit_cost": 2.52},
                    {"name": "MHL 40oz", "unit_cost": 2.59},
                    {"name": "Steel Reserve 40oz", "unit_cost": 2.52},
                    {"name": "Bud Ice 40oz", "unit_cost": 2.52},
                ],
                "24oz cans Domestic": [
                    {"name": "Miller Lite 24oz cans", "unit_cost": 3.35},
                    {"name": "Coors Light 24oz cans", "unit_cost": 2.74},
                    {"name": "Coors Banquet 24oz cans", "unit_cost": 2.74},
                    {"name": "Bud Light 25oz cans", "unit_cost": 2.74},
                    {"name": "Budweiser 25oz cans", "unit_cost": 2.64},
                ],
                "32oz High End": [
                    {"name": "Dos Equis 32oz bottles", "unit_cost": 2.74},
                    {"name": "Corona Familiar 32oz bottles", "unit_cost": 2.52},
                    {"name": "Michelob Ultra 32oz bottles", "unit_cost": 2.65},
                ],
                "24oz High End": [
                    {"name": "Modelo Family 24oz cans", "unit_cost": 8.51},
                    {"name": "Corona Family 24oz cans", "unit_cost": 8.51},
                    {"name": "Dos Equis Family 24oz cans", "unit_cost": 8.51},
                    {"name": "Heineken 24oz cans", "unit_cost": 7.29},
                    {"name": "Michelob Ultra 25oz can", "unit_cost": 9.03},
                    {"name": "Bud Chelada 25oz can", "unit_cost": 8.98},
                ],
                "24oz High End and Flavor": [
                    {"name": "Twisted Tea Family 24oz cans", "unit_cost": 9.44},
                    {"name": "Smirnoff Family 23.5oz", "unit_cost": 8.58},
                    {"name": "Mike's Family 23.5oz", "unit_cost": 8.58},
                    {"name": "4 Loko 24oz cans", "unit_cost": 8.58},
                    {"name": "Cayman 24oz cans", "unit_cost": 8.58},
                    {"name": "Club Tails 24oz cans", "unit_cost": 16.43},
                    {"name": "Monster 24oz cans", "unit_cost": 14.40},
                ],
                "19.2oz High End and Flavor": [
                    {"name": "New Belgium Revolver", "unit_cost": 12.75},
                    {"name": "Angry Orchard", "unit_cost": 13.64},
                    {"name": "White Claw", "unit_cost": 13.64},
                ],
                "Domestic 6pk 12oz": [
                    {"name": "Miller Lite 6pk bottles", "unit_cost": 12.28},
                    {"name": "Coors Light 6pk bottles", "unit_cost": 13.65},
                    {"name": "Coors Banquet 6pk bottles", "unit_cost": 17.60},
                    {"name": "Bud Light 6pk bottles", "unit_cost": 17.60},
                    {"name": "Budweiser 6pk bottles", "unit_cost": 18.55},
                ],
                "Budget 6pk 16oz cans": [
                    {"name": "Keystone Light 6pk 16oz cans", "unit_cost": 19.40},
                    {"name": "Lonestar 6pk 16oz cans", "unit_cost": 19.40},
                    {"name": "Natural Light 6pk 16oz cans", "unit_cost": 19.40},
                    {"name": "Busch Light 6pk 16oz cans", "unit_cost": 19.40},
                ],
                "Import and High End 6pk": [
                    {"name": "Modelo 6pk bottles", "unit_cost": 18.00},
                    {"name": "Corona Extra 6pk bottles", "unit_cost": 18.00},
                    {"name": "Dos Equis 6pk bottles", "unit_cost": 18.00},
                    {"name": "Heineken 6pk bottles", "unit_cost": 18.00},
                    {"name": "Michelob Ultra 6pk bottles", "unit_cost": 18.00},
                    {"name": "Modelo 6pk cans", "unit_cost": 21.55},
                    {"name": "Michelob Ultra 6pk 16oz cans", "unit_cost": 21.55},
                    {"name": "Flight 6pk 16oz cans", "unit_cost": 21.50},
                ],
                "6pk bottle Flavor": [
                    {"name": "Smirnoff", "unit_cost": 21.50},
                    {"name": "Mikes", "unit_cost": 21.50},
                    {"name": "Topo Chico", "unit_cost": 21.50},
                    {"name": "Cayman Jack", "unit_cost": 21.50},
                    {"name": "White Claw", "unit_cost": 21.50},
                ],
                "12pk Import & High End": [
                    {"name": "Modelo Especial 12pk bottles", "unit_cost": 21.50},
                    {"name": "Modelo Chelada 12pk cans", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 12pk bottles", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 12pk cans", "unit_cost": 21.50},
                    {"name": "Modelo 12pk cans", "unit_cost": 21.50},
                    {"name": "Corona Premier 12pk cans", "unit_cost": 21.50},
                    {"name": "Dos Equis 12pk cans", "unit_cost": 21.50},
                    {"name": "Flight 12pk cans", "unit_cost": 21.50},
                ],
                "Domestic 12pk 12oz and 9pk 16oz": [
                    {"name": "Miller Lite 12pk 12oz cans", "unit_cost": 12.75},
                    {"name": "Coors Light 12pk 12oz cans", "unit_cost": 12.75},
                    {"name": "Coors Banquet 12pk 12oz cans", "unit_cost": 12.75},
                    {"name": "Yuengling Lager 12pk 12oz cans", "unit_cost": 12.75},
                    {"name": "Miller Lite 9pk 16oz", "unit_cost": 11.60},
                    {"name": "Coors Light 9pk 16oz", "unit_cost": 11.60},
                    {"name": "Bud Light 12pk 12oz cans", "unit_cost": 12.40},
                    {"name": "Budweiser 12pk 12oz cans", "unit_cost": 12.20},
                ],
                "Domestic 12pk 16oz cans": [
                    {"name": "Miller Lite 12pk 16oz cans", "unit_cost": 14.40},
                    {"name": "Coors Light 12pk 16oz cans", "unit_cost": 13.25},
                    {"name": "Coors Banquet 12pk 16oz cans", "unit_cost": 13.25},
                    {"name": "Bud Light 12pk 16oz cans", "unit_cost": 13.25},
                    {"name": "Budweiser 12pk 16oz cans", "unit_cost": 13.25},
                ],
                "15pk and 18pk Budget": [
                    {"name": "Keystone Light 15pk 12oz cans", "unit_cost": 2.03},
                    {"name": "Natural Light 15pk 12oz cans", "unit_cost": 2.03},
                    {"name": "Busch Light 18pk 12oz cans", "unit_cost": 2.03},
                ],
                "15pk and 18pk": [
                    {"name": "Miller Lite 18pk 12oz cans", "unit_cost": 14.35},
                    {"name": "Coors Light 18pk 12oz cans", "unit_cost": 17.60},
                    {"name": "Miller Lite 15pk 16oz alum pint", "unit_cost": 17.60},
                    {"name": "Coors Light 15pk 16oz alum pint", "unit_cost": 17.60},
                    {"name": "Bud Light 18pk 12oz cans", "unit_cost": 18.55},
                    {"name": "Budweiser 18pk 12oz cans", "unit_cost": 19.40},
                    {"name": "Modelo 18pk 12oz cans", "unit_cost": 19.40},
                    {"name": "Michelob Ultra 18pk 12oz cans", "unit_cost": 19.40},
                ],
            }
        }
    },
    "Oklahoma": {
        "Oklahoma Central": {
            "counties": ["Oklahoma"],
            "products": {
                "24oz cans Budget": [
                    {"name": "Keystone Light 24oz cans", "unit_cost": 1.99},
                    {"name": "Steel Reserve 24oz cans", "unit_cost": 1.99},
                    {"name": "Steel Reserve Flavor 24oz cans", "unit_cost": 1.99},
                    {"name": "Natural Light 25oz cans", "unit_cost": 1.99},
                    {"name": "Busch 25oz cans", "unit_cost": 1.15},
                    {"name": "Bud Ice 25oz cans", "unit_cost": 1.15},
                    {"name": "Mil Best Ice 24oz cans", "unit_cost": 1.99},
                    {"name": "Busch Ice 25oz cans", "unit_cost": 1.99},
                ],
                "32oz & 40oz Budget": [
                    {"name": "MHL 32oz can", "unit_cost": 1.99},
                    {"name": "Mil Best 32oz Crusher", "unit_cost": 2.48},
                    {"name": "Mickeys 40oz", "unit_cost": 2.38},
                    {"name": "Steel Reserve 40oz", "unit_cost": 2.38},
                ],
                "24oz cans Domestic": [
                    {"name": "Miller Lite 24oz cans", "unit_cost": 2.28},
                    {"name": "Coors Light 24oz cans", "unit_cost": 3.29},
                    {"name": "Coors Banquet 24oz cans", "unit_cost": 3.29},
                    {"name": "Bud Light 25oz cans", "unit_cost": 2.59},
                    {"name": "Budweiser 25oz cans", "unit_cost": 2.47},
                ],
                "32oz High End": [
                    {"name": "Dos Equis 32oz bottles", "unit_cost": 2.59},
                    {"name": "Corona Familiar 32oz bottles", "unit_cost": 2.59},
                    {"name": "Michelob Ultra 32oz bottles", "unit_cost": 2.59},
                ],
                "24oz High End": [
                    {"name": "Modelo Family 24oz cans", "unit_cost": 2.59},
                    {"name": "Corona Family 24oz cans", "unit_cost": 2.46},
                    {"name": "Dos Equis Family 24oz cans", "unit_cost": 7.08},
                    {"name": "Heineken 24oz cans", "unit_cost": 6.73},
                    {"name": "Michelob Ultra 25oz can", "unit_cost": 5.33},
                    {"name": "Bud Chelada 25oz can", "unit_cost": 5.16},
                ],
                "24oz High End and Flavor": [
                    {"name": "Twisted Tea Family 24oz cans", "unit_cost": 4.50},
                    {"name": "Smirnoff Family 23.5oz", "unit_cost": 8.65},
                    {"name": "Mike's Family 23.5oz", "unit_cost": 8.65},
                    {"name": "4 Loko 24oz cans", "unit_cost": 7.99},
                    {"name": "Cayman 24oz cans", "unit_cost": 7.05},
                    {"name": "Club Tails 24oz cans", "unit_cost": 8.65},
                    {"name": "Monster 24oz cans", "unit_cost": 8.65},
                ],
                "19.2oz High End and Flavor": [
                    {"name": "New Belgium", "unit_cost": 16.39},
                    {"name": "Angry Orchard", "unit_cost": 13.25},
                    {"name": "White Claw", "unit_cost": 14.00},
                ],
                "Domestic 6pk 12oz": [
                    {"name": "Miller Lite 6pk bottles", "unit_cost": 13.25},
                    {"name": "Coors Light 6pk bottles", "unit_cost": 11.60},
                    {"name": "Coors Banquet 6pk bottles", "unit_cost": 11.60},
                    {"name": "Bud Light 6pk bottles", "unit_cost": 11.60},
                    {"name": "Budweiser 6pk bottles", "unit_cost": 12.40},
                ],
                "Budget 6pk 16oz cans": [
                    {"name": "Keystone Light 6pk 16oz cans", "unit_cost": 12.20},
                    {"name": "Lonestar 6pk 16oz cans", "unit_cost": 12.20},
                    {"name": "Natural Light 6pk 16oz cans", "unit_cost": 12.20},
                    {"name": "Busch Light 6pk 16oz cans", "unit_cost": 12.20},
                ],
                "Budget 4pk 16oz cans": [
                    {"name": "Steel Reserve 4pk 16oz cans", "unit_cost": 14.35},
                    {"name": "Bud Ice 4pk 16oz cans", "unit_cost": 17.80},
                ],
                "Domestic 6pk 16oz cans": [
                    {"name": "Miller Lite 6pk 16oz cans", "unit_cost": 14.35},
                    {"name": "Coors Light 6pk 16oz cans", "unit_cost": 20.90},
                    {"name": "Coors Banquet 6pk 16oz cans", "unit_cost": 18.00},
                    {"name": "Bud Light 4pk 16oz cans", "unit_cost": 18.00},
                    {"name": "Budweiser 4pk 16oz cans", "unit_cost": 21.55},
                ],
                "Import and High End 6pk": [
                    {"name": "Modelo 6pk bottles", "unit_cost": 21.55},
                    {"name": "Corona Extra 6pk bottles", "unit_cost": 21.55},
                    {"name": "Dos Equis 6pk bottles", "unit_cost": 21.50},
                    {"name": "Heineken 6pk bottles", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 6pk bottles", "unit_cost": 21.50},
                    {"name": "Modelo 6pk cans", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 6pk 16oz cans", "unit_cost": 21.50},
                    {"name": "Flight 6pk 16oz cans", "unit_cost": 21.50},
                ],
                "6pk bottle Flavor": [
                    {"name": "Smirnoff", "unit_cost": 21.50},
                    {"name": "Mikes", "unit_cost": 21.50},
                    {"name": "Topo Chico", "unit_cost": 21.50},
                    {"name": "Cayman Jack", "unit_cost": 21.50},
                    {"name": "White Claw", "unit_cost": 21.50},
                ],
                "12pk Import & High End": [
                    {"name": "Modelo Especial 12pk bottles", "unit_cost": 21.50},
                    {"name": "Modelo Chelada 12pk cans", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 12pk bottles", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 12pk cans", "unit_cost": 21.50},
                    {"name": "Modelo 12pk cans", "unit_cost": 21.50},
                    {"name": "Corona Premier 12pk cans", "unit_cost": 21.50},
                    {"name": "Corona Premier 12pk bts", "unit_cost": 21.50},
                    {"name": "Dos Equis 12pk cans", "unit_cost": 21.50},
                    {"name": "Flight 12pk cans", "unit_cost": 21.50},
                ],
                "Domestic 12pk 12oz and 9pk 16oz": [
                    {"name": "Miller Lite 12pk 12oz cans", "unit_cost": 11.60},
                    {"name": "Coors Light 12pk 12oz cans", "unit_cost": 11.60},
                    {"name": "Coors Banquet 12pk 12oz cans", "unit_cost": 11.60},
                    {"name": "Yuengling Lager 12pk 12oz cans", "unit_cost": 11.60},
                    {"name": "Miller Lite 9pk 16oz", "unit_cost": 12.40},
                    {"name": "Coors Light 9pk 16oz", "unit_cost": 12.20},
                    {"name": "Bud Light 12pk 12oz cans", "unit_cost": 12.20},
                    {"name": "Budweiser 12pk 12oz cans", "unit_cost": 12.20},
                ],
                "Domestic 12pk 16oz cans": [
                    {"name": "Miller Lite 12pk 16oz cans", "unit_cost": 12.20},
                    {"name": "Coors Light 12pk 16oz cans", "unit_cost": 12.20},
                    {"name": "Coors Banquet 12pk 16oz cans", "unit_cost": 12.20},
                    {"name": "Bud Light 12pk 16oz cans", "unit_cost": 12.20},
                    {"name": "Budweiser 12pk 16oz cans", "unit_cost": 12.20},
                ],
                "15pk and 18pk Budget": [
                    {"name": "Keystone Light 15pk 12oz cans", "unit_cost": 1.99},
                    {"name": "Natural Light 15pk 12oz cans", "unit_cost": 1.99},
                    {"name": "Busch Light 18pk 12oz cans", "unit_cost": 1.99},
                ],
                "15pk and 18pk": [
                    {"name": "Miller Lite 18pk 12oz cans", "unit_cost": 18.00},
                    {"name": "Coors Light 18pk 12oz cans", "unit_cost": 18.00},
                    {"name": "Miller Lite 15pk 16oz alum pint", "unit_cost": 21.55},
                    {"name": "Coors Light 15pk 16oz alum pint", "unit_cost": 21.55},
                    {"name": "Bud Light 18pk 12oz cans", "unit_cost": 21.55},
                    {"name": "Budweiser 18pk 12oz cans", "unit_cost": 21.50},
                    {"name": "Modelo 18pk 12oz cans", "unit_cost": 21.50},
                    {"name": "Michelob Ultra 18pk 12oz cans", "unit_cost": 21.50},
                ],
                "30pk Budget": [
                    {"name": "Keystone Light", "unit_cost": 21.50},
                    {"name": "MHL", "unit_cost": 21.50},
                    {"name": "Natural Light", "unit_cost": 21.50},
                    {"name": "Busch", "unit_cost": 21.50},
                ],
                "30pk Domestic": [
                    {"name": "Miller Lite", "unit_cost": 21.50},
                    {"name": "Coors Light", "unit_cost": 21.50},
                    {"name": "Coors Banquet", "unit_cost": 21.50},
                    {"name": "Bud Light", "unit_cost": 21.50},
                    {"name": "Budweiser", "unit_cost": 21.50},
                ],
            }
        }
    }
}

# ============= Models =============

class ProductEntry(BaseModel):
    product_name: str
    unit_cost: float
    retail_price: Optional[float] = None
    percent_difference: Optional[float] = None


class SurveyCreate(BaseModel):
    date_of_survey: str
    # Full customer fields from CSV
    customer_id: Optional[str] = ''
    customer_name: Optional[str] = ''
    ar_account: Optional[str] = ''
    chain: Optional[str] = ''
    phone: Optional[str] = ''
    territory: Optional[str] = ''
    account_status: Optional[str] = ''
    customer_type: Optional[str] = ''
    last_month_sales: Optional[str] = ''
    product_group: Optional[str] = ''
    distribution_area: Optional[str] = ''
    # Legacy fields for backward compat
    account_manager: Optional[str] = ''
    account_name: Optional[str] = ''
    state: str
    region: str
    county: str
    products: List[ProductEntry]


class Survey(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date_of_survey: str
    # Full customer fields
    customer_id: Optional[str] = ''
    customer_name: Optional[str] = ''
    ar_account: Optional[str] = ''
    chain: Optional[str] = ''
    phone: Optional[str] = ''
    territory: Optional[str] = ''
    account_status: Optional[str] = ''
    customer_type: Optional[str] = ''
    last_month_sales: Optional[str] = ''
    product_group: Optional[str] = ''
    distribution_area: Optional[str] = ''
    # Legacy fields
    account_manager: Optional[str] = ''
    account_name: Optional[str] = ''
    state: str
    region: str
    county: str
    products: List[ProductEntry]
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= API Routes =============

@api_router.get("/customers/search")
async def search_customers(query: str):
    """Search customers by name, ID, or AR Account. Requires at least 2 characters."""
    if not query or len(query) < 2:
        return {"results": []}

    q = query.lower().strip()

    results = [
        c for c in CUSTOMERS_DATA
        if q in c.get("Customer Name", "").lower()
        or q in c.get("Customer ID", "").lower()
        or q in c.get("AR Account", "").lower()
    ][:10]

    return {"results": results}


@api_router.get("/")
async def root():
    return {"message": "Price Survey API"}


@api_router.get("/states")
async def get_states():
    return {"states": list(LOCATION_DATA.keys())}


@api_router.get("/regions/{state}")
async def get_regions(state: str):
    if state not in LOCATION_DATA:
        raise HTTPException(status_code=404, detail="State not found")
    return {"regions": list(LOCATION_DATA[state].keys())}


@api_router.get("/counties/{state}/{region}")
async def get_counties(state: str, region: str):
    if state not in LOCATION_DATA:
        raise HTTPException(status_code=404, detail="State not found")
    if region not in LOCATION_DATA[state]:
        raise HTTPException(status_code=404, detail="Region not found")
    return {"counties": LOCATION_DATA[state][region]["counties"]}


@api_router.get("/products/{state}/{region}")
async def get_products(state: str, region: str):
    if state not in LOCATION_DATA:
        raise HTTPException(status_code=404, detail="State not found")
    if region not in LOCATION_DATA[state]:
        raise HTTPException(status_code=404, detail="Region not found")
    return {"products": LOCATION_DATA[state][region]["products"]}


@api_router.post("/surveys", response_model=Survey)
async def create_survey(survey: SurveyCreate):
    survey_obj = Survey(**survey.dict())
    # Build the insert doc independently - never share with survey_obj
    # because insert_one mutates the dict in-place by injecting _id
    insert_doc = {
        "id": survey_obj.id,
        "date_of_survey": survey_obj.date_of_survey,
        "customer_id": survey_obj.customer_id,
        "customer_name": survey_obj.customer_name,
        "ar_account": survey_obj.ar_account,
        "chain": survey_obj.chain,
        "phone": survey_obj.phone,
        "territory": survey_obj.territory,
        "account_status": survey_obj.account_status,
        "customer_type": survey_obj.customer_type,
        "last_month_sales": survey_obj.last_month_sales,
        "product_group": survey_obj.product_group,
        "distribution_area": survey_obj.distribution_area,
        "account_manager": survey_obj.account_manager,
        "account_name": survey_obj.account_name,
        "state": survey_obj.state,
        "region": survey_obj.region,
        "county": survey_obj.county,
        "products": [p.dict() for p in survey_obj.products],
        "created_at": survey_obj.created_at,
    }
    await db.surveys.insert_one(insert_doc)
    return survey_obj


@api_router.get("/surveys", response_model=List[Survey])
async def get_surveys():
    surveys = await db.surveys.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Survey(**s) for s in surveys]



# Product → Category mapping (mirrors frontend PRODUCT_CATEGORY_MAP)
PRODUCT_CATEGORY_MAP = {
    "Keystone Light 24oz cans": "24oz cans Budget", "Steel Reserve 24oz cans": "24oz cans Budget",
    "Steel Reserve Flavor 24oz cans": "24oz cans Budget", "Lone Star 24oz cans": "24oz cans Budget",
    "Pabst 24oz cans": "24oz cans Budget", "Natural Light 25oz cans": "24oz cans Budget",
    "Busch 25oz cans": "24oz cans Budget", "Bud Ice 25oz cans": "24oz cans Budget",
    "Mil Best Ice 24oz cans": "24oz cans Budget", "Busch Ice 25oz cans": "24oz cans Budget",
    "MHL 32oz can": "32oz & 40oz Budget", "MHL 32oz bottle": "32oz & 40oz Budget",
    "Mil Best 32oz Crusher": "32oz & 40oz Budget", "Mickeys 40oz": "32oz & 40oz Budget",
    "MHL 40oz": "32oz & 40oz Budget", "Steel Reserve 40oz": "32oz & 40oz Budget",
    "Bud Ice 40oz": "32oz & 40oz Budget",
    "Miller Lite 24oz cans": "24oz cans Domestic", "Coors Light 24oz cans": "24oz cans Domestic",
    "Coors Banquet 24oz cans": "24oz cans Domestic", "Bud Light 25oz cans": "24oz cans Domestic",
    "Budweiser 25oz cans": "24oz cans Domestic",
    "Corona Familiar": "32oz High End", "Michelob Ultra 24oz": "32oz High End",
    "Dos Equis 32oz bottles": "32oz High End", "Corona Familiar 32oz bottles": "32oz High End",
    "Michelob Ultra 32oz bottles": "32oz High End",
    "Modelo Family": "24oz High End", "Corona Family": "24oz High End",
    "Dos Equis Family": "24oz High End", "Heineken": "24oz High End",
    "Michelob Ultra": "24oz High End", "Bud Chelada": "24oz High End",
    "Modelo Family 24oz cans": "24oz High End", "Corona Family 24oz cans": "24oz High End",
    "Dos Equis Family 24oz cans": "24oz High End", "Heineken 24oz cans": "24oz High End",
    "Michelob Ultra 25oz can": "24oz High End", "Bud Chelada 25oz can": "24oz High End",
    "Twisted Tea Family 24oz cans": "24oz High End and Flavor",
    "Smirnoff Family 23.5oz": "24oz High End and Flavor",
    "Mike's Family 23.5oz": "24oz High End and Flavor", "4 Loko 24oz cans": "24oz High End and Flavor",
    "Cayman 24oz cans": "24oz High End and Flavor", "Club Tails 24oz cans": "24oz High End and Flavor",
    "Monster 24oz cans": "24oz High End and Flavor", "Cantaritos": "24oz High End and Flavor",
    "New Belgium": "19.2oz High End and Flavor", "New Belgium Revolver": "19.2oz High End and Flavor",
    "Revolver": "19.2oz High End and Flavor", "Angry Orchard": "19.2oz High End and Flavor",
    "White Claw": "19.2oz High End and Flavor", "Cayman Jacked": "19.2oz High End and Flavor",
    "Miller Lite 6pk bottles": "Domestic 6pk 12oz", "Coors Light 6pk bottles": "Domestic 6pk 12oz",
    "Coors Banquet 6pk bottles": "Domestic 6pk 12oz", "Bud Light 6pk bottles": "Domestic 6pk 12oz",
    "Budweiser 6pk bottles": "Domestic 6pk 12oz",
    "Keystone Light 6pk 16oz cans": "Budget 6pk 16oz cans", "Lonestar 6pk 16oz cans": "Budget 6pk 16oz cans",
    "Natural Light 6pk 16oz cans": "Budget 6pk 16oz cans", "Busch Light 6pk 16oz cans": "Budget 6pk 16oz cans",
    "Steel Reserve 4pk 16oz cans": "Budget 6pk 16oz cans", "Bud Ice 4pk 16oz cans": "Budget 6pk 16oz cans",
    "Miller Lite 6pk 16oz cans": "Budget 6pk 16oz cans", "Coors Light 6pk 16oz cans": "Budget 6pk 16oz cans",
    "Coors Banquet 6pk 16oz cans": "Budget 6pk 16oz cans", "Bud Light 4pk 16oz cans": "Budget 6pk 16oz cans",
    "Budweiser 4pk 16oz cans": "Budget 6pk 16oz cans",
    "Modelo 6pk bottles": "Import and High End 6pk", "Corona Extra 6pk bottles": "Import and High End 6pk",
    "Dos Equis 6pk bottles": "Import and High End 6pk", "Heineken 6pk bottles": "Import and High End 6pk",
    "Michelob Ultra 6pk bottles": "Import and High End 6pk", "Modelo 6pk cans": "Import and High End 6pk",
    "Michelob Ultra 6pk 16oz cans": "Import and High End 6pk", "Flight 6pk 16oz cans": "Import and High End 6pk",
    "Smirnoff": "6pk bottle Flavor", "Mikes": "6pk bottle Flavor",
    "Topo Chico": "6pk bottle Flavor", "Cayman Jack": "6pk bottle Flavor",
    "Modelo Especial 12pk bottles": "12pk Import & High End", "Modelo Chelada 12pk cans": "12pk Import & High End",
    "Michelob Ultra 12pk bottles": "12pk Import & High End", "Michelob Ultra 12pk cans": "12pk Import & High End",
    "Modelo 12pk cans": "12pk Import & High End", "Corona Premier 12pk cans": "12pk Import & High End",
    "Corona Premier 12pk bts": "12pk Import & High End", "Dos Equis 12pk cans": "12pk Import & High End",
    "Heineken 12pk cans": "12pk Import & High End", "Flight 12pk cans": "12pk Import & High End",
    "Miller Lite 12pk 12oz cans": "Domestic 12pk 12oz and 9pk 16oz",
    "Coors Light 12pk 12oz cans": "Domestic 12pk 12oz and 9pk 16oz",
    "Coors Banquet 12pk 12oz cans": "Domestic 12pk 12oz and 9pk 16oz",
    "Yuengling Lager 12pk 12oz cans": "Domestic 12pk 12oz and 9pk 16oz",
    "Miller Lite 9pk 16oz": "Domestic 12pk 12oz and 9pk 16oz",
    "Coors Light 9pk 16oz": "Domestic 12pk 12oz and 9pk 16oz",
    "Bud Light 12pk 12oz cans": "Domestic 12pk 12oz and 9pk 16oz",
    "Budweiser 12pk 12oz cans": "Domestic 12pk 12oz and 9pk 16oz",
    "Miller Lite 12pk 16oz cans": "Domestic 12pk 16oz cans",
    "Coors Light 12pk 16oz cans": "Domestic 12pk 16oz cans",
    "Coors Banquet 12pk 16oz cans": "Domestic 12pk 16oz cans",
    "Bud Light 12pk 16oz cans": "Domestic 12pk 16oz cans",
    "Budweiser 12pk 16oz cans": "Domestic 12pk 16oz cans",
    "Miller Lite 18pk 12oz cans": "15pk and 18pk (Multiple categories)",
    "Coors Light 18pk 12oz cans": "15pk and 18pk (Multiple categories)",
    "Miller Lite 15pk 16oz alum pint": "15pk and 18pk (Multiple categories)",
    "Coors Light 15pk 16oz alum pint": "15pk and 18pk (Multiple categories)",
    "Bud Light 18pk 12oz cans": "15pk and 18pk (Multiple categories)",
    "Budweiser 18pk 12oz cans": "15pk and 18pk (Multiple categories)",
    "Modelo 18pk 12oz cans": "15pk and 18pk (Multiple categories)",
    "Michelob Ultra 18pk 12oz cans": "15pk and 18pk (Multiple categories)",
    "Keystone Light 15pk 12oz cans": "15pk and 18pk Budget",
    "Natural Light 15pk 12oz cans": "15pk and 18pk Budget",
    "Busch Light 18pk 12oz cans": "15pk and 18pk Budget",
    "Keystone Light": "30pk Budget", "MHL": "30pk Budget",
    "Natural Light": "30pk Budget", "Busch": "30pk Budget",
    "Miller Lite": "30pk Domestic", "Coors Light": "30pk Domestic",
    "Coors Banquet": "30pk Domestic", "Bud Light": "30pk Domestic", "Budweiser": "30pk Domestic",
}

ALL_CATEGORIES = [
    "24oz cans Budget", "32oz & 40oz Budget", "24oz cans Domestic", "32oz High End",
    "24oz High End", "24oz High End and Flavor", "19.2oz High End and Flavor",
    "Domestic 6pk 12oz", "Budget 6pk 16oz cans", "Import and High End 6pk",
    "6pk bottle Flavor", "12pk Import & High End", "Domestic 12pk 12oz and 9pk 16oz",
    "Domestic 12pk 16oz cans", "15pk and 18pk (Multiple categories)",
    "15pk and 18pk Budget", "15pk and 18pk", "30pk Budget", "30pk Domestic",
]

# NOTE: This route MUST be declared before /surveys/{survey_id} to prevent
# FastAPI from matching "export" as a survey_id path parameter.
@api_router.get("/surveys/export/csv")
async def export_surveys_csv():
    """
    Export surveys as flat CSV.
    One row per product. Columns:
    Date | Customer info... | Category | Product | Unit Cost | Retail Price | Margin %
    """
    surveys = await db.surveys.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Date of Survey",
        "Customer ID",
        "Customer Name",
        "AR Account",
        "Chain",
        "Customer Type",
        "Territory",
        "State",
        "Region",
        "County",
        "Category",
        "Product",
        "Unit Cost",
        "Retail Price",
        "Margin %",
    ])

    # One row per product, with Category column populated
    for survey in surveys:
        info = [
            survey.get("date_of_survey", ""),
            survey.get("customer_id", ""),
            survey.get("customer_name", "") or survey.get("account_name", ""),
            survey.get("ar_account", ""),
            survey.get("chain", ""),
            survey.get("customer_type", ""),
            survey.get("territory", ""),
            survey.get("state", ""),
            survey.get("region", ""),
            survey.get("county", ""),
        ]
        for product in survey.get("products", []):
            pname  = product.get("product_name", "")
            cat    = PRODUCT_CATEGORY_MAP.get(pname, "Other")
            unit   = product.get("unit_cost")
            retail = product.get("retail_price")
            margin = product.get("percent_difference")
            writer.writerow(info + [
                cat,
                pname,
                f"${unit:.2f}"   if unit   is not None else "",
                f"${retail:.2f}" if retail is not None else "",
                f"{margin:.2f}%" if margin is not None else "",
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=price_surveys.csv"},
    )


@api_router.get("/surveys/{survey_id}", response_model=Survey)
async def get_survey(survey_id: str):
    survey = await db.surveys.find_one({"id": survey_id}, {"_id": 0})
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return Survey(**survey)


@api_router.delete("/surveys/{survey_id}")
async def delete_survey(survey_id: str):
    result = await db.surveys.delete_one({"id": survey_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Survey not found")
    return {"message": "Survey deleted successfully"}


# ============= App Config =============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
