const { matchSchema } = require("../schema/match-schema");
const { prisma } = require("../utils/connection");

const updateMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { player1_result } = req.body;
    const { error } = matchSchema(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const findMatch = await prisma.matches.findUnique({ where: { id } });
    if (!findMatch) return res.status(404).json({ message: "Match not found" });

    if (findMatch.player1_result != null) {
      return res.status(400).json({ message: "Match result already set" });
    }

    let player2_result;
    let scoreIncrementPlayer1 = 0;
    let scoreIncrementPlayer2 = 0;
    let winnerId = null;
    let loserId = null;

    if (player1_result === "WIN") {
      player2_result = "LOSS";
      scoreIncrementPlayer1 = 3;
      winnerId = findMatch.player1_id;
      loserId = findMatch.player2_id;
    } else if (player1_result === "LOSS") {
      player2_result = "WIN";
      scoreIncrementPlayer2 = 3;
      winnerId = findMatch.player2_id;
      loserId = findMatch.player1_id;
    } else if (player1_result === "DRAW") {
      player2_result = "DRAW";
      scoreIncrementPlayer1 = 1;
      scoreIncrementPlayer2 = 1;
      winnerId = findMatch.player1_id;
      loserId = findMatch.player2_id;
    } else {
      return res.status(400).json({ message: "Invalid match result" });
    }

    await prisma.matches.update({
      where: { id },
      data: {
        player1_result,
        player2_result,
      },
    });

    await updatePlayerScores(
      findMatch.tournament_id,
      findMatch.player1_id,
      scoreIncrementPlayer1
    );
    await updatePlayerScores(
      findMatch.tournament_id,
      findMatch.player2_id,
      scoreIncrementPlayer2
    );

    await updatePlayerRating(winnerId, player1_result === "DRAW" ? 0 : 10);
    await updatePlayerRating(loserId, player1_result === "DRAW" ? 0 : -5);

    await handleNewPairings(
      findMatch.tournament_id,
      player1_result === "DRAW"
        ? [findMatch.player1_id, findMatch.player2_id]
        : [winnerId]
    );

    const remainingMatches = await prisma.matches.count({
      where: {
        tournament_id: findMatch.tournament_id,
        player2_id: null,
      },
    });

    if (remainingMatches === 0) {
      await prisma.tournaments.update({
        where: { id: findMatch.tournament_id },
        data: { end_date: new Date() },
      });
    }

    res.json({ message: "Match and scores updated successfully" });
  } catch (error) {
    next(error);
  }
};

const updatePlayerScores = async (tournamentId, userId, scoreIncrement) => {
  if (scoreIncrement !== 0) {
    const userTournamentScore = await prisma.tournamentPlayers.findFirst({
      where: { tournament_id: tournamentId, user_id: userId },
      select: { user_tournament_score: true },
    });

    const updatedScore =
      userTournamentScore.user_tournament_score + scoreIncrement;

    await prisma.tournamentPlayers.update({
      where: {
        user_id_tournament_id: {
          user_id: userId,
          tournament_id: tournamentId,
        },
      },
      data: { user_tournament_score: updatedScore },
    });
  }
};

const updatePlayerRating = async (userId, ratingChange) => {
  if (ratingChange !== 0) {
    await prisma.users.update({
      where: { id: userId },
      data: { rating: { increment: ratingChange } },
    });
  }
};

const handleNewPairings = async (tournamentId, playerIds) => {
  const pendingMatches = await prisma.matches.findMany({
    where: {
      tournament_id: tournamentId,
      player2_id: null,
    },
  });

  if (playerIds.length === 2) {
    const [player1, player2] = playerIds;

    const existingMatch = pendingMatches.find(
      (match) => match.player1_id === player1 || match.player1_id === player2
    );

    if (existingMatch) {
      await prisma.matches.update({
        where: { id: existingMatch.id },
        data: {
          player2_id: player1 === existingMatch.player1_id ? player2 : player1,
        },
      });
    } else {
      await prisma.matches.create({
        data: {
          player1_id: player1,
          player2_id: player2,
          tournament_id: tournamentId,
        },
      });
    }
  } else {
    const winnerId = playerIds[0];

    if (pendingMatches.length > 0) {
      await prisma.matches.update({
        where: { id: pendingMatches[0].id },
        data: { player2_id: winnerId },
      });
    } else {
      await prisma.matches.create({
        data: {
          player1_id: winnerId,
          player2_id: null,
          tournament_id: tournamentId,
        },
      });
    }
  }
};

const showMatches = async (req, res, next) => {
  try {
    const matches = await prisma.matches.findMany({
      select: {
        id: true,
        player1_id: true,
        player1: true,
        player2_id: true,
        player2: true,
        player1_result: true,
        player2_result: true,
        created_at: true,
        tournament_id: true,
        tournament: true,
      },
    });
    res.json({ matches });
  } catch (error) {
    next(error);
  }
};

const showPersonal = async (req, res, next) => {
  try {
    const matches = await prisma.matches.findMany({
      where: {
        OR: [{ player1_id: req.user.id }, { player2_id: req.user.id }],
      },
      select: {
        id: true,
        player1: true,
        player2: true,
        player1_result: true,
        player2_result: true,
        created_at: true,
        tournament: true,
      },
    });
    res.json({ matches });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateMatch,
  showMatches,
  showPersonal,
};
