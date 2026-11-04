package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5"
)

type User struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Age    int    `json:"age"`
	Gender string `json:"gender"`
}

type UserRequest struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Name      string `json:"name"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
}

type Response struct {
	Status string `json:"status"`
	ID     int    `json:"id,omitempty"`
	Name   string `json:"name,omitempty"`
}

func simpleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req UserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "name": req.Name})
}

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("DATABASE_URL not set, using simple handler (no DB)")
		mux := http.NewServeMux()
		mux.HandleFunc("/api/user", simpleHandler)
		mux.HandleFunc("/register", simpleHandler)
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		log.Printf("Listening on :%s (no DB)", port)
		log.Fatal(http.ListenAndServe(":"+port, mux))
	} else {
		// With DB
		db, err := pgx.Connect(context.Background(), dsn)
		if err != nil {
		log.Printf("DB connection failed: %v, using simple handler", err)
		mux := http.NewServeMux()
		mux.HandleFunc("/api/user", simpleHandler)
		mux.HandleFunc("/register", simpleHandler)
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		log.Printf("DB connection failed, using simple handler on :%s", port)
		log.Fatal(http.ListenAndServe(":"+port, mux))
	}
		defer db.Close(context.Background())

		if err := ensureTable(db); err != nil {
			log.Fatalf("ensure table: %v", err)
		}

		mux := http.NewServeMux()
		mux.HandleFunc("/api/user", userHandler(db))
		mux.HandleFunc("/register", userHandler(db))
		mux.HandleFunc("/health", healthHandler)

		origin := os.Getenv("FRONTEND_URL")
		if origin == "" {
			origin = "*"
		}

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			mux.ServeHTTP(w, r)
		})

		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		log.Printf("Listening on :%s", port)
		log.Fatal(http.ListenAndServe(":"+port, handler))
	}
}

func userHandler(db *pgx.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req UserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		var id int
		err := db.QueryRow(context.Background(),
			"INSERT INTO users (name, age, gender) VALUES ($1, $2, $3) RETURNING id",
			req.Name, req.Age, req.Gender,
		).Scan(&id)
		if err != nil {
			log.Printf("DB insert error: %v", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(Response{Status: "ok", ID: id, Name: req.Name})
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func ensureTable(db *pgx.Conn) error {
	_, err := db.Exec(context.Background(), "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, age INT NOT NULL, gender TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())")
	return err
}
