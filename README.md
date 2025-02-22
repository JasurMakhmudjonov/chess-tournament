# Chess Tournament Management System

This is a Chess Tournament Management System built using Node.js and PostgreSQL. This project provides APIs to manage chess tournaments, players, matches, and results.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)

## Installation

1. Clone the repository:

    
    git clone https://github.com/fmcoder23/chess-tournament.git
    cd chess-tournament
    

2. Install dependencies:

    
    npm install
    

## Configuration

1. Create a `.env` file in the root directory and fill it with your configuration settings.

    
    cp .env.example .env
    

2. Edit the `.env` file to match your database configuration:

    
    DATABASE_URL=postgresql://user:password@localhost:5432/chess_tournament
    

    There is a public database in the cloud already configured in the .env.example file with some sample data. You can use this database or change the DATABASE_URL to point to your own database if preferred.

## Database Setup

1. Run Prisma migrations to set up the database schema:

    
    npx prisma db push
    

## Running the Application

1. Start the server:

    
    npm start
    

## API Documentation

API endpoints and their usage are documented in the Chess Tournament API.postman_collection.json file. You can import this file into Postman to explore and test the available endpoints.
