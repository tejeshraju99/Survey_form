from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import io
import csv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============= LOCATION DATA =============
# Based on Excel: Texas (regions: Texas, Texas West), Oklahoma (no regions, direct counties)

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
    account_manager: str
    account_name: str
    state: str
    region: str
    county: str
    products: List[ProductEntry]

class Survey(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date_of_survey: str
    account_manager: str
    account_name: str
    state: str
    region: str
    county: str
    products: List[ProductEntry]
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============= API Routes =============

@api_router.get("/")
async def root():
    return {"message": "Price Survey API"}

@api_router.get("/states")
async def get_states():
    """Get all available states"""
    return {"states": list(LOCATION_DATA.keys())}

@api_router.get("/regions/{state}")
async def get_regions(state: str):
    """Get regions for a specific state"""
    if state not in LOCATION_DATA:
        raise HTTPException(status_code=404, detail="State not found")
    return {"regions": list(LOCATION_DATA[state].keys())}

@api_router.get("/counties/{state}/{region}")
async def get_counties(state: str, region: str):
    """Get counties for a specific state and region"""
    if state not in LOCATION_DATA:
        raise HTTPException(status_code=404, detail="State not found")
    if region not in LOCATION_DATA[state]:
        raise HTTPException(status_code=404, detail="Region not found")
    return {"counties": LOCATION_DATA[state][region]["counties"]}

@api_router.get("/products/{state}/{region}")
async def get_products(state: str, region: str):
    """Get products with unit costs for a specific state and region"""
    if state not in LOCATION_DATA:
        raise HTTPException(status_code=404, detail="State not found")
    if region not in LOCATION_DATA[state]:
        raise HTTPException(status_code=404, detail="Region not found")
    return {"products": LOCATION_DATA[state][region]["products"]}

@api_router.post("/surveys", response_model=Survey)
async def create_survey(survey: SurveyCreate):
    """Create a new survey submission"""
    survey_dict = survey.dict()
    survey_obj = Survey(**survey_dict)
    await db.surveys.insert_one(survey_obj.dict())
    return survey_obj

@api_router.get("/surveys", response_model=List[Survey])
async def get_surveys():
    """Get all survey submissions"""
    surveys = await db.surveys.find().sort("created_at", -1).to_list(1000)
    return [Survey(**survey) for survey in surveys]

@api_router.get("/surveys/{survey_id}", response_model=Survey)
async def get_survey(survey_id: str):
    """Get a specific survey by ID"""
    survey = await db.surveys.find_one({"id": survey_id})
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return Survey(**survey)

@api_router.delete("/surveys/{survey_id}")
async def delete_survey(survey_id: str):
    """Delete a survey"""
    result = await db.surveys.delete_one({"id": survey_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Survey not found")
    return {"message": "Survey deleted successfully"}

@api_router.get("/surveys/export/csv")
async def export_surveys_csv():
    """Export all surveys as CSV"""
    surveys = await db.surveys.find().sort("created_at", -1).to_list(1000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Survey ID", "Date of Survey", "Account Manager", "Account Name",
        "State", "Region", "County", "Product Name", "Unit Cost", 
        "Retail Price", "% Difference", "Created At"
    ])
    
    # Write data rows
    for survey in surveys:
        for product in survey.get("products", []):
            writer.writerow([
                survey.get("id", ""),
                survey.get("date_of_survey", ""),
                survey.get("account_manager", ""),
                survey.get("account_name", ""),
                survey.get("state", ""),
                survey.get("region", ""),
                survey.get("county", ""),
                product.get("product_name", ""),
                product.get("unit_cost", ""),
                product.get("retail_price", ""),
                product.get("percent_difference", ""),
                survey.get("created_at", "")
            ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=price_surveys.csv"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
