import os
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class Collections:
    USERS = "users"

class Database:
    _instance = None
    _client = None
    _db = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            uri = os.getenv("DB_CONNECTION")
            if not uri:
                raise ValueError("X La variable DB_CONNECTION no está definida en el .env")
            
            cls._client = MongoClient(uri)
        return cls._instance

    @staticmethod
    def get_database():
        if Database._instance is None:
            Database()
        return Database._instance

    def connect(self):
        if self._db is None:
            try:
                self._db = self._client["ready2go"]
                print("Database connected")
            except Exception as e:
                print(f"Error connecting to database: {e}")
                raise e
        return self._db

    async def getAllUsersWithEmbeddings(self):
        db = self.connect()
        usersCollection = db[Collections.USERS]
        
        users = usersCollection.find(
            {"embedding": {"$exists": True, "$ne": None}},
            {"embedding": 1, "_id": 1}
        )
        
        return [{"id": str(user["_id"]), "embedding": user["embedding"]} for user in users]
    
 
 