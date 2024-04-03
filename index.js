import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
const app = express();

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "library",
  password: "root",
  port: 5432,
});

db.connect();
let booksData = [];
db.query(
  `SELECT book.bookId, book.title, author."authorName" AS author, book.isbn, book.publisher, book."pbYear", genre."genreName" AS genre, book."description", book."totalCopies", book."availableCopies" FROM book JOIN author ON book."authorId" = author."authorId" JOIN genre ON book."genreId" = genre."genreId";`,
  (err, res) => {
    if (err) {
      console.log("Error existing query: " + err.stack);
    } else {
      booksData = res.rows;
    }
  }
);

// Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// GET home page
app.get("/", (req, res) => {
  res.send("Welcome to Libra");
});

app.get("/books", (req, res) => {
  // console.log(booksData)
  res.render("books", { books: booksData });
});

app.get("/addBook", (req, res) => {
  res.render("addBook");
});

app.get("/removeBook", (req, res) => {
  res.render("removeBook")
})

app.get("/editBook", (req, res) => {
  res.render("editBook")
})

// Route to handle form submission and add book to the database
app.post("/add-book", async (req, res) => {
  const {
    bookId,
    title,
    author,
    isbn,
    publisher,
    pbYear,
    genre,
    description,
    totalCopies,
    availableCopies,
  } = req.body;

  try {
    // Retrieve author ID based on the provided author name
    const authorQuery = {
      text: `SELECT "authorId" FROM public.author WHERE "authorName" = $1`,
      values: [author],
    };

    const authorResult = await db.query(authorQuery);
    const authorId = authorResult.rows[0].authorId;

    // Retrieve genre ID based on the provided genre name
    const genreQuery = {
      text: `SELECT "genreId" FROM public.genre WHERE "genreName" = $1`,
      values: [genre],
    };

    const genreResult = await db.query(genreQuery);
    const genreId = genreResult.rows[0].genreId;

    // Execute the query to insert the book record
    const insertQuery = {
      text: `
        INSERT INTO public.book (
          bookId, title, "authorId", isbn, publisher, "pbYear", "genreId", description, "totalCopies", "availableCopies"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      values: [bookId, title, authorId, isbn, publisher, pbYear, genreId, description, totalCopies, availableCopies],
    };

    await db.query(insertQuery);

    res.status(200).send("Book added successfully");
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).send("Error adding book to the database");
  }
});


// Route to fetch authors from the database
app.get("/get-authors", (req, res) => {
  db.query('SELECT "authorName" FROM author', (err, result) => {
    if (err) {
      console.error("Error fetching authors:", err);
      res.status(500).json({ error: "Error fetching authors" });
    } else {
      // Extract author names from the query result
      const authors = result.rows.map((row) => row.authorName);
      // Send the list of authors as JSON response
      // console.log(authors);
      res.json(authors);
    }
  });
});


// Route to fetch genres from the database
app.get("/get-genres", (req, res) => {
  db.query('SELECT "genreName" FROM genre;', (err, result) => {
    if (err) {
      console.error("Error fetching genres:", err);
      res.status(500).json({ error: "Error fetching genres" });
    } else {
      // Extract genre names from the query result
      const genres = result.rows.map((row) => row.genreName);
      // Send the list of genres as JSON response
      // console.log(genres);
      res.json(genres);
    }
  });
});


// Remove book route
app.get("/remove-book", (req, res) => {
  const bookId = req.query.bookId;
  db.query('DELETE FROM book WHERE bookId = $1', [bookId], (err, result) => {
    if (err) {
      console.error("Error deleting book:", err);
      res.render('delete-error'); // Render delete error view
    } else {
      res.render('delete-success'); // Render delete success view
    }
  });
});


// Express route to fetch book details
app.get("/get-book-details/:bookId", (req, res) => {
  const bookId = req.params.bookId;

  // Query database to fetch book details including author name
  db.query(
    `SELECT book.*, author."authorName" 
    FROM book 
    JOIN author ON book."authorId" = author."authorId" 
    WHERE book.bookId = $1`,
    [bookId]
  )
    .then(result => {
      if (result.rows.length > 0) {
        // Send fetched book details as JSON response
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ message: "Book not found" });
      }
    })
    .catch(error => {
      console.error("Error fetching book details:", error);
      res.status(500).json({ message: "Error fetching book details" });
    });
});


// Express route to update book details
app.post("/edit-book", (req, res) => {
  const { bookId, title, author, isbn, publisher, pbYear, genre, description, totalCopies, availableCopies } = req.body;

  // Update book details in the database based on bookId
  db.query("UPDATE book SET title = $1, isbn = $3, publisher = $4, pbYear = $5, genre = $6, description = $7, totalCopies = $8, availableCopies = $9 WHERE bookId = $10;", [title, author, isbn, publisher, pbYear, genre, description, totalCopies, availableCopies, bookId])
      .then(() => {
          // Send success message to client
          res.json({ message: "Book updated successfully" });
      })
      .catch(error => {
          console.error("Error updating book:", error);
          res.status(500).json({ message: "Error updating book" });
      });
});

app.listen(3000);
