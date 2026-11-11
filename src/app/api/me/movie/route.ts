import { db } from "@/lib/db";
import { currentUserId } from "@/server/session";
import { movieHandler } from "@/server/http";
import { saveFirstMovie } from "@/server/movies";

export const runtime = "nodejs";
export const PUT = movieHandler(currentUserId, (id, movie) => saveFirstMovie(db, id, movie));
