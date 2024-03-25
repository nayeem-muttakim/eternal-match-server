const express = require("express");

const cors = require("cors");

const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();

const app = express();

app.use(express.json());

app.use(cors());

const port = process.env.PORT || 3000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bix9lir.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("matrimony");
    const users = database.collection("users");
    const biodatas = database.collection("biodatas");
    const favbiodatas = database.collection("favbiodatas");
    const requestInfo = database.collection("requestInfo");

    //  jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // console.log(token);
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, dec) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.dec = dec;

        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.dec.email;
      const query = { email: email };
      const user = await users.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //users
    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if does not exist
      const query = { email: user.email };

      const exist = await users.findOne(query);
      if (exist) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await users.insertOne(user);
      res.send(result);
    });

    // biodatas
    app.post("/biodatas", verifyToken, async (req, res) => {
      const biodata = req.body;
      const result = await biodatas.insertOne(biodata);
      res.send(result);
    });

    app.get("/biodata/mine/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };

      const result = await biodatas.findOne(filter);
      res.send(result);
    });
    app.get("/biodata/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await biodatas.findOne(filter);
      res.send(result);
    });
    app.get("/biodatas", verifyToken, async (req, res) => {
      let query = {};
      const filter = req.query;
      const type = filter.type;
      const division = filter.division;
      const age = filter.age.split(',');
      const low =parseInt(age[0])
      const high =parseInt(age[1])
      // console.log(typeof(high));
      if (type || division || low || high) {
        query = {
          type: { $regex: type },
          present_division: { $regex: division },
          "age": { $gte: low, $lte: high },
        };
      }
      const result = await biodatas.find(query).toArray();
      res.send(result);
    });
    app.patch("/biodata/mine", verifyToken, async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query?.email };
      }

      const update = req.body;
      // console.log(update);
      const result = await biodatas.updateOne(query, {
        $set: update,
      });

      res.send(result);
    });

    // fav bios
    app.post("/favourites", verifyToken, async (req, res) => {
      const favbio = req.body;
      const result = await favbiodatas.insertOne(favbio);
      res.send(result);
    });
    app.post("/request-info", verifyToken, async (req, res) => {
      const reqInfo = req.body;
      const result = await requestInfo.insertOne(reqInfo);
      res.send(result);
    });

    app.get("/favourites/mine", verifyToken, async (req, res) => {
      let query = {};
      if (req.query?.user) {
        query = { user: req.query.user };
      }
      const result = await favbiodatas.find(query).toArray();

      res.send(result);
    });
    app.get("/requests/mine", verifyToken, async (req, res) => {
      let query = {};
      if (req.query?.user) {
        query = { user: req.query.user };
      }
      const result = await requestInfo.find(query).toArray();

      res.send(result);
    });
    app.delete("/favourites/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const result = await favbiodatas.deleteOne(filter);
      res.send(result);
    });
    app.delete("/requests/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const result = await requestInfo.deleteOne(filter);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Browser");
});

app.listen(port, () => {
  console.log(`App listening on ${port}`);
});
