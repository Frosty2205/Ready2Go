import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';

config();

const Collections = Object.freeze({
    // Users have: name, password (encrypted), embedding (of the face), clothes, created_at(timestamp)
    // Para guardar el embedding, habrá que llamar a server.py en /vision para que devuelva el embedding
    USERS: "users",
    USERNAMES: "usernames",
    OBJECTS: "objects",
    EVENTS_OBJECTS: "events_objects",
    CAMERAS: "cameras"
})

export class Database {
    static #database;
    static getDatabase = () => Database.#database || new Database();
    #client;
    #db;
    #SALT_ROUNDS = 10;

    constructor() {
        if (Database.#database) {
            return Database.#database;
        }
        Database.#database = this;
        this.#client = new MongoClient(process.env.DB_CONNECTION);
    }

    async connect() {
        if (!this.#db) {
            await this.#client.connect();
            this.#db = this.#client.db("ready2go");
            console.log("Database connected");
        }
        return this.#db
    }

    async createUser(user) {
        const db = await this.connect();
        const usersCol = db.collection(Collections.USERS);
        const usernamesCol = db.collection(Collections.USERNAMES);

        const { name, email, username, password, embedding } = user;

        const hashed_password = await bcrypt.hash(password, this.#SALT_ROUNDS);

        const result = await usersCol.insertOne({
            name: name,
            email: email,
            username: username,
            password: hashed_password,
            embedding: embedding,
            created_at: new Date()
        })
        return result.insertedId;
    }

    async addUsername(username) {
        const db = await this.connect();
        const usernamesCol = db.collection(Collections.USERNAMES);
        const result = await usernamesCol.insertOne({ username });
        return result.insertedId;
    }

    async deleteUsername(username) {
        const db = await this.connect();
        await db.collection(Collections.USERNAMES).deleteOne({ username });
    }

    async deleteUser(userId) {
        const db = await this.connect();
        const result = await db.collection(Collections.USERS).deleteOne({ 
            _id: new ObjectId(userId) 
        });
        return result.deletedCount > 0;
    }

    async updateUser(userId, update) {
        const db = await this.connect();
        const usersCol = db.collection(Collections.USERS);
        const result = await usersCol.updateOne(
            { _id: new ObjectId(userId) },
            { $set: update }
        );
        return result.modifiedCount > 0;
    }

    async checkUser(username, password) {
        const db = await this.connect();

        const user = await db.collection(Collections.USERS).findOne({ username });

        if (!user) {
            console.log("Usuario no encontrado en la DB");
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password);

        return isValid ? user : null;

    }

    async getUser(username) {
        const db = await this.connect();

        const user = await db.collection(Collections.USERS).findOne({ username });

        return user;
    }

    async getUserById(userId) {
        const db = await this.connect();
        const user = await db.collection(Collections.USERS).findOne({ _id: new ObjectId(userId) });
        return user;
    }

    async getClothes(username) {
        const user = await this.getUser(username);

        if (!user) {
            console.log("Usuario no encontrado en la DB");
            return null;
        }

        return user.clothes || [];
    }

    async addClothes(username, clothes) {
        const db = await this.connect();

        const result = await db.collection(Collections.USERS).updateOne(
            { username: username },
            { $push: { clothes: clothes } }
        );

        return result.modifiedCount > 0;
    }

    // btener los objetos configurados 
    async getObjects(userId) {
        const user = await this.getUserById(userId);

        if (!user) {
            console.log("Usuario no encontrado en la DB para recuperar objetos");
            return null;
        }
        return user.objects || [];
    }

    async getCalendarId(userId) {
        const user = await this.getUserById(userId);
        if (!user) {
            console.log("Usuario no encontrado en la DB para recuperar calendarId");
            return null;
        }
        return user.calendarId || null;
    }

    //actualiza la lista de objetos
    async addObjects(userId, objects) {
        const db = await this.connect();

        const result = await db.collection(Collections.USERS).updateOne(
            { _id: new ObjectId(userId) },
            { $set: { objects: objects } } 
        );

        return result.modifiedCount > 0;
    }

    async addObjectsToEvent(userId, eventId, objects) {
        const db = await this.connect()

        const result = await db.collection('events_objects').updateOne(
        { userId: new ObjectId(userId), eventId: eventId },
        { $set: { objects: objects } },
        { upsert: true } // Si no existe, lo crea
        );
        console.log("Ha añadido los objetos al evento en la base de datos");
        return result.acknowledged;
    }

    async getObjectsList() {
        const db = await this.connect();
        const objects = await db.collection(Collections.OBJECTS).find({}).toArray();
        return objects;
    }

    async getAllUsersWithEmbeddings() {
        const db = await this.connect();
        
        const users = await db.collection(Collections.USERS).find(
            { embedding: { $exists: true, $ne: null } },
            { projection: { username: 1, embedding: 1 } }
        ).toArray();
        return users;
    }

    async saveGoogleTokens(userId, tokens) {
        const db = await this.connect();
        return await db.collection(Collections.USERS).updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    googleAccessToken: tokens.access_token,
                    googleRefreshToken: tokens.refresh_token,
                    googleTokenExpiry: tokens.expiry_date
                } 
            }
        );
    }

    async getGoogleTokens(userId) {
        const db = await this.connect();
        const user = await db.collection(Collections.USERS).findOne(
            { _id: new ObjectId(userId) },
            { projection: { googleAccessToken: 1, googleRefreshToken: 1, googleTokenExpiry: 1 } }
        );
        // Usuario existe y token guardado
        return (user && user.googleAccessToken) ? {
            accessToken: user.googleAccessToken,
            refreshToken: user.googleRefreshToken,
            expiryDate: user.googleTokenExpiry
        } : null;
    }

}