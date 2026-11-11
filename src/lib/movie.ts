import { AppError } from "./errors";

export const MOVIE_MAX_LENGTH = 120;

export function parseMovie(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some((key) => key !== "movie") ||
      !("movie" in body) || typeof body.movie !== "string") {
    throw new AppError("INVALID_MOVIE", "Send a movie title as text.", 400);
  }
  const movie = body.movie.trim();
  // One-character titles (for example M) are valid films.
  if (movie.length < 1 || movie.length > MOVIE_MAX_LENGTH || /[\u0000-\u001f\u007f]/.test(movie)) {
    throw new AppError("INVALID_MOVIE", "Use a movie title between 1 and 120 characters, without line breaks.", 400);
  }
  return movie;
}
