const LeagueModel = require('../models/leagueModel');
const UserModel = require('../models/userModel');
const bcrypt = require('bcrypt');

const leagueController = {
    getLeagues: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'No autorizado.' });
        }

        try {
            const cookieValue = req.cookies.auth_session;
            const userId = cookieValue.split('logged_in_user_')[1];

            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;

            const leagues = await LeagueModel.findPagedByUserId(userId, limit, offset);
            return res.status(200).json(leagues);
        } catch (error) {
            console.error('Error al obtener las ligas paginadas:', error);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
    },

    createLeague: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Non authorized. Log in first' });
        }

        const { name, inv_code } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'League name is required' });
        }

        try {
            const cookieValue = req.cookies.auth_session;
            const creatorId = cookieValue.split('logged_in_user_')[1];

            const leagueExists = await LeagueModel.findByName(name);
            if (leagueExists) {
                return res.status(400).json({ error: 'League name is already taken' });
            }
            if (inv_code.length > 128) {
                return res.status(400).json({ error: 'Invitation Code cannot be longer than 128 characters.' });
            }

            const newLeagueId = await LeagueModel.createLeagueWithParticipant(name, inv_code, creatorId);

            return res.status(201).json({ 
                message: 'League successfully created!', 
                leagueId: newLeagueId 
            });
        } catch (error) {
            console.error('League creation error', error);
            return res.status(500).json({ error: 'Database server error' });
        }
    },

    joinLeague: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Non authorized. Log in first' });
        }
        const { name, inv_code } = req.body;
        if(!name){
            return res.status(400).json({error: 'League name is required'});
        }
        try{
            const cookieValue = req.cookies.auth_session;
            const userId = cookieValue.split('logged_in_user_')[1];
            const league = await LeagueModel.findByName(name);
            if(!league){
                return res.status(400).json({ error: 'Wrong name or invitation code' });
            }
            if(await LeagueModel.isInProgress(league.league_id)){
                return res.status(400).json({ error: 'This league has already started'});
            }
            const isParticipant = await LeagueModel.isParticipant(userId, league.league_id);
            if(isParticipant){
                return res.status(400).json({error: 'You are already a participant in this league'});
            }
            const newParticipant = await LeagueModel.joinLeague(userId, league.league_id);
            return res.status(200).json({
                message: `joined the league: ${league.name}!`,
                leagueId: league.league_id
            })
        } catch (error) {
            console.error('Joining league error', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'You are already a participant in this league.' });
            }
            return res.status(500).json({error: 'Database server error'});
        }
    },

    getLeagueDetails: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Not authorized. Please log in first.' });
        }

        const { id } = req.params;

        try {
            const cookieValue = req.cookies.auth_session;
            const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);

            const league = await LeagueModel.findById(id);
            if (!league) return res.status(404).json({ error: 'League not found.' });

            let participants = await LeagueModel.getParticipants(id);

            const isParticipant = participants.some(p => p.user_id === currentUserId);
            if (!isParticipant) {
                return res.status(403).json({ error: 'Access denied. You are not a participant.' });
            }

            // 💥 AQUÍ ESTÁ LA CLAVE: Comparamos IDs numéricos en el servidor
            const isCreator = (league.creator_id === currentUserId);

            let nextMatch = null;
            let opponentNextMatchInfo = null;

            if (league.in_progress) {
                // 1. Nos traemos TODOS los partidos jugados de la liga una sola vez para no saturar la BD
                const playedMatches = await LeagueModel.getPlayedMatches(id);

                // 2. Definimos la función mágica de desempate por bloques
                async function ordenarBloque(grupo) {
                    if (grupo.length <= 1) return grupo;

                    // Si el grupo tiene exactamente 2 jugadores -> Criterio 3 (Partido Directo)
                    if (grupo.length === 2) {
                        const [a, b] = grupo;
                        const directMatch = playedMatches.find(m => 
                            (m.player1 === a.user_id && m.player2 === b.user_id) ||
                            (m.player1 === b.user_id && m.player2 === a.user_id)
                        );

                        if (directMatch) {
                            let winnerId = null;
                            if (directMatch.lives_player1 > directMatch.lives_player2) winnerId = directMatch.player1;
                            else if (directMatch.lives_player2 > directMatch.lives_player1) winnerId = directMatch.player2;

                            if (winnerId === a.user_id) return [a, b];
                            if (winnerId === b.user_id) return [b, a];
                        }
                        // Si no hay partido directo o dio empate, desempatamos por nombre (Criterio 4)
                        return [a, b].sort((x, y) => x.username.localeCompare(y.username, 'es', { sensitivity: 'base' }));
                    }

                    // Si el grupo tiene 3 o más jugadores -> Criterio 3 (Miniliga)
                    if (grupo.length >= 3) {
                        const idsGrupo = grupo.map(p => p.user_id);
                        
                        // Calculamos cuántos partidos DEBERÍAN haberse jugado en esta miniliga: N * (N - 1) / 2
                        const partidosTeoricos = (grupo.length * (grupo.length - 1)) / 2;

                        // Filtramos los partidos donde AMBOS jugadores pertenecen a este grupo de empate
                        const partidosMiniliga = playedMatches.filter(m => 
                            idsGrupo.includes(m.player1) && idsGrupo.includes(m.player2)
                        );

                        // Si no se han jugado todos los partidos de la miniliga, se cancela y pasamos al criterio 4 (alfabético)
                        if (partidosMiniliga.length !== partidosTeoricos) {
                            return grupo.sort((x, y) => x.username.localeCompare(y.username, 'es', { sensitivity: 'base' }));
                        }

                        // Inicializamos un marcador de estadísticas exclusivo para la miniliga
                        const statsMiniliga = {};
                        grupo.forEach(p => {
                            statsMiniliga[p.user_id] = { wins: 0, losses: 0, lives_won: 0, lives_against: 0 };
                        });

                        // Computamos los datos SOLO de los partidos de la miniliga
                        partidosMiniliga.forEach(m => {
                            const p1 = statsMiniliga[m.player1];
                            const p2 = statsMiniliga[m.player2];

                            p1.lives_won += m.lives_player1;
                            p1.lives_against += m.lives_player2;
                            p2.lives_won += m.lives_player2;
                            p2.lives_against += m.lives_player1;

                            if (m.lives_player1 > m.lives_player2) {
                                p1.wins += 1;
                                p2.losses += 1;
                            } else {
                                p2.wins += 1;
                                p1.losses += 1;
                            }
                        });

                        // Ordenamos el grupo según los criterios 1 y 2 recalculados en la miniliga
                        grupo.sort((a, b) => {
                            const sA = statsMiniliga[a.user_id];
                            const sB = statsMiniliga[b.user_id];

                            const netWinsA = sA.wins - sA.losses;
                            const netWinsB = sB.wins - sB.losses;
                            if (netWinsB !== netWinsA) return netWinsB - netWinsA;

                            const livesDifA = sA.lives_won - sA.lives_against;
                            const livesDifB = sB.lives_won - sB.lives_against;
                            if (livesDifB !== livesDifA) return livesDifB - livesDifA;

                            return 0; // Siguen empatados en la miniliga
                        });

                        // 🔥 RECURSIVIDAD COMPLETA:
                        // Volvemos a agrupar por si la miniliga rompió algunos empates pero dejó otros activos
                        return await procesarGrupos(grupo, statsMiniliga);
                    }
                }

                // Auxiliar para subdividir y aplicar las reglas recursivamente si quedan empates parciales
                async function procesarGrupos(lista, statsReferencia = null) {
                    const subGrupos = [];
                    let grupoActual = [lista[0]];

                    for (let i = 1; i < lista.length; i++) {
                        const a = lista[i - 1];
                        const b = lista[i];

                        let estanEmpatados = false;

                        if (statsReferencia) {
                            // Si venimos de una miniliga, comparamos basándonos en las estadísticas de la miniliga
                            const sA = statsReferencia[a.user_id];
                            const sB = statsReferencia[b.user_id];
                            estanEmpatados = (sA.wins - sA.losses === sB.wins - sB.losses) && 
                                            (sA.lives_won - sA.lives_against === sB.lives_won - sB.lives_against);
                        } else {
                            // Si es la primera pasada global, comparamos con las estadísticas generales de la liga
                            estanEmpatados = ((a.wins || 0) - (a.losses || 0) === (b.wins || 0) - (b.losses || 0)) &&
                                            (((a.lives_won || 0) - (a.lives_against || 0)) === ((b.lives_won || 0) - (b.lives_against || 0)));
                        }

                        if (estanEmpatados) {
                            grupoActual.push(b);
                        } else {
                            subGrupos.push(grupoActual);
                            grupoActual = [b];
                        }
                    }
                    subGrupos.push(grupoActual);

                    // Procesamos cada subgrupo de manera independiente y unimos los resultados ordenados
                    let resultadoFinal = [];
                    for (const subGrupo of subGrupos) {
                        // Si el subgrupo sigue empatado tras una miniliga y no se puede romper más, tiramos de alfabeto
                        if (statsReferencia && subGrupo.length === lista.length) {
                            subGrupo.sort((x, y) => x.username.localeCompare(y.username, 'es', { sensitivity: 'base' }));
                            resultadoFinal = resultadoFinal.concat(subGrupo);
                        } else {
                            const grupoOrdenado = await ordenarBloque(subGrupo);
                            resultadoFinal = resultadoFinal.concat(grupoOrdenado);
                        }
                    }
                    return resultadoFinal;
                }
                let listaParaOrdenar = [...participants];
                // 3. EJECUCIÓN: Ordenación global inicial por criterios 1 y 2 básicos
                listaParaOrdenar.sort((a, b) => {
                    const netWinsA = (a.wins || 0) - (a.losses || 0);
                    const netWinsB = (b.wins || 0) - (b.losses || 0);
                    if (netWinsB !== netWinsA) return netWinsB - netWinsA;

                    const livesDifA = (a.lives_won || 0) - (a.lives_against || 0);
                    const livesDifB = (b.lives_won || 0) - (b.lives_against || 0);
                    if (livesDifB !== livesDifA) return livesDifB - livesDifA;

                    return 0;
                });

                // Lanzamos el procesador recursivo para resolver los empates que hayan quedado de la lista global
                participants = await procesarGrupos(listaParaOrdenar);
                nextMatch = await LeagueModel.getNextMatchForUser(id, currentUserId);

                if (nextMatch && nextMatch.player1 !== null && nextMatch.player2 !== null) {
                    const opponentId = (nextMatch.player1 === currentUserId) ? nextMatch.player2 : nextMatch.player1;
                    if (opponentId) {
                        const opponentNextMatch = await LeagueModel.getNextMatchForUser(id, opponentId);
                        const nextDisplayRound = (opponentNextMatch?.round_number ?? nextMatch.round_number) + 1;
                        opponentNextMatchInfo = {
                            opponentUserId: opponentId,
                            isReadyToPlay: Boolean(opponentNextMatch && opponentNextMatch.id === nextMatch.id),
                            roundNumber: nextDisplayRound
                        };
                    }
                }
            }

            return res.status(200).json({
                league,
                participants,
                isCreator, // 👈 Enviamos este booleano limpio al frontend
                currentUserId,
                nextMatch,
                opponentNextMatchInfo
            });

        } catch (error) {
            console.error('Error fetching league details:', error);
            return res.status(500).json({ error: 'Database server error.' });
        }
    },

    kickParticipant: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Not authorized.' });
        }

        const { leagueId, userIdToKick } = req.body;
        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);

        try {
            // Buscar la liga para verificar quién es el creador real
            const league = await LeagueModel.findById(leagueId);
            if (!league) return res.status(404).json({ error: 'League not found.' });

            // 🔥 VALIDACIÓN DE SEGURIDAD ABSOLUTA 🔥
            if (league.creator_id !== currentUserId) {
                return res.status(403).json({ error: 'Only the league creator can kick players.' });
            }

            // No permitir que el creador se auto-elimine de su propia liga
            if (parseInt(userIdToKick, 10) === currentUserId) {
                return res.status(400).json({ error: 'You cannot kick yourself from your own league.' });
            }

            // Proceder a la eliminación
            await LeagueModel.removeParticipant(leagueId, userIdToKick);

            return res.status(200).json({ message: 'Player removed successfully.' });

        } catch (error) {
            console.error('Error kicking participant:', error);
            return res.status(500).json({ error: 'Server error.' });
        }
    },

    startLeague: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Not authorized.' });
        }

        const { id: leagueId } = req.params;
        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);
        try{
            const league = await LeagueModel.findById(leagueId);
            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }
            if(league.in_progress){
                return res.status(400).json({ error: 'League has already started.'});
            }
            // 2. 🔥 CONTROL DE SEGURIDAD: ¿El de la cookie es el creador?
            if (league.creator_id !== currentUserId) {
                return res.status(403).json({ error: 'Access denied. Only the creator can start this league.' });
            }

            const participantIds = await LeagueModel.getParticipantsIds(leagueId);
            if (participantIds.length < 2) {
                return res.status(400).json({ error: 'Cannot start a league with less than 2 players.' });
            }
            const randomizedParticipants = [...participantIds];
            if (randomizedParticipants.length % 2 !== 0){
                randomizedParticipants.push(null);
            }
            for (let i = randomizedParticipants.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Intercambiamos los elementos en las posiciones i y j
                [randomizedParticipants[i], randomizedParticipants[j]] = [randomizedParticipants[j], randomizedParticipants[i]];
            }
            for (let i = 1; i<randomizedParticipants.length; i++){
                const roundId = await LeagueModel.createRound(leagueId);
                for(let j=0; j<randomizedParticipants.length/2; j++){
                    const player1 = randomizedParticipants[j];
                    const player2 = randomizedParticipants[randomizedParticipants.length-1-j];
                    await LeagueModel.createMatch(player1, player2, leagueId, roundId);
                }
                randomizedParticipants.splice(1, 0, randomizedParticipants.pop());
            }
            const rounds = await LeagueModel.getAllRoundsId(leagueId);
            for (let i = rounds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Intercambiamos los elementos en las posiciones i y j
                [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
            }
            for (let i=0;i<rounds.length;i++){
                await LeagueModel.updateRoundNumber(rounds[i], i+1);
            }
            await LeagueModel.updateInProgress(leagueId, true);
            return res.status(200).json({ message: 'League successfully started and rounds generated.' });
        } catch (error){
            console.error('Error starting league:', error);
            return res.status(500).json({ error: 'Server error.' });
        }
    },

    getLeagueMatches: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Unauthorized: No session cookie found.' });
        }

        const { leagueId } = req.params;
        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);

        try {
            const matches = await LeagueModel.getLeagueMatches(leagueId, currentUserId);
            return res.status(200).json({ matches, currentUserId });
        } catch (error) {
            console.error('Error in getLeagueMatches:', error);
            return res.status(500).json({ error: 'Internal server error loading matches.' });
        }
    },

    updateMatchResult: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Unauthorized: No session cookie found.' });
        }

        const { leagueId } = req.params;
        const { player1Id, player2Id, livesPlayer1, livesPlayer2 } = req.body;

        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);

        // Normalizar player ids a enteros o null para comparaciones seguras
        const p1 = (player1Id === null || player1Id === undefined || player1Id === '') ? null : parseInt(player1Id, 10);
        const p2 = (player2Id === null || player2Id === undefined || player2Id === '') ? null : parseInt(player2Id, 10);

        if (p1 !== currentUserId && p2 !== currentUserId) {
            return res.status(401).json({ error: 'Unauthorized action' });
        }

        try {
            if (livesPlayer1 === undefined || livesPlayer2 === undefined) {
                return res.status(400).json({ error: 'Missing scores for players.' });
            }
            const charactersExist = await LeagueModel.areCharactersSelected(leagueId, player1Id, player2Id);
            if(!charactersExist && p1 && p2){
                return res.status(401).json({ error: "The two players MUST select a character"});
            }

            const opponentId = (p1 === currentUserId) ? p2 : (p2 === currentUserId ? p1 : null);
            if (opponentId) {
                const currentUserNextMatch = await LeagueModel.getNextMatchForUser(leagueId, currentUserId);
                const opponentNextMatch = await LeagueModel.getNextMatchForUser(leagueId, opponentId);
                const isReadyToPlay = Boolean(
                    currentUserNextMatch &&
                    opponentNextMatch &&
                    currentUserNextMatch.id === opponentNextMatch.id &&
                    (
                        (currentUserNextMatch.player1 === p1 && currentUserNextMatch.player2 === p2) ||
                        (currentUserNextMatch.player1 === p2 && currentUserNextMatch.player2 === p1)
                    )
                );

                if (!isReadyToPlay) {
                    return res.status(409).json({ error: 'Both players must be ready for this round before posting the result.' });
                }
            }

            const actualizado = await LeagueModel.updateMatchScore(
                leagueId,
                p1,
                p2,
                livesPlayer1,
                livesPlayer2
            );

            if (!actualizado) {
                return res.status(404).json({ error: 'Match not found' });
            }

            // 🔥 CLAVE: Recuperamos la función de forma segura desde req.app sin imports circulares
            const broadcastToLeague = req.app.get('broadcastToLeague');
            
            if (typeof broadcastToLeague === 'function') {
                broadcastToLeague(leagueId, {
                    event: 'match-updated',
                    leagueId: leagueId
                });
            }

            return res.status(200).json({ message: 'Result updated successfully!' });

        } catch (error) {
            console.error('Error in updateMatchResult:', error);
            return res.status(500).json({ error: 'Internal server error saving the score.' });
        }
    },

    deleteLeague: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Unauthorized: No session cookie found.' });
        }

        const { leagueId } = req.params;
        const { password } = req.body;
        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);

        if (!password) {
            return res.status(400).json({ error: 'Password is required to delete the league.' });
        }

        try {
            // 1. Validar que la liga exista
            const league = await LeagueModel.findById(leagueId);
            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }

            // 2. Validar que sea el creador
            if (currentUserId !== league.creator_id) {
                return res.status(401).json({ error: 'You cannot delete a league if you are not its creator.' });
            }

            // 3. 🆕 VALIDAR CONTRASEÑA: Busca al usuario en tu DB (Usa tu propio UserModel)
            const user = await UserModel.findById(currentUserId);
            if (!user) {
                return res.status(401).json({ error: 'User not found.' });
            }

            // Compara las contraseñas usando bcrypt con el campo `hashed_password`
            const isValidPassword = await bcrypt.compare(password, user.hashed_password);
            
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Incorrect account password.' });
            }

            // 4. Si todo es correcto, borramos
            const deleted = await LeagueModel.deleteLeague(leagueId);
            if (!deleted) {
                return res.status(400).json({ error: 'League could not be deleted.' });
            }

            return res.status(200).json({
                message: `Deleted the league: ${league.name}!`,
                leagueId: league.league_id
            });
            
        } catch (error) {
            console.error('Error in deleteLeague:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    },

    getUnableCharacters: async (req, res) => {
        // 1️⃣ Validamos que exista la cookie de sesión
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Unauthorized: No session cookie found.' });
        }
        
        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);
        
        // 2️⃣ Extraemos las variables de la URL (params)
        const { leagueId, matchId } = req.params; 

        try {
            // 3️⃣ Validamos que el usuario realmente pertenezca a la liga
            const isParticipantC = await LeagueModel.isParticipant(currentUserId, leagueId);
            if (!isParticipantC){
                return res.status(403).json({ error: 'You cannot get information while not being part of the league' });
            }

            // 4️⃣ Llamamos al modelo pasándole el ID del usuario actual
            const blockedCharactersId = await LeagueModel.getBlockedCharacters(leagueId, currentUserId);
            
            // 5️⃣ Devolvemos el array de ints puro para que tu vista lo reciba correctamente
            return res.status(200).json(blockedCharactersId);
            
        } catch (error) {
            console.error('Error in getUnableCharacters:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    },

    selectCharacter: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Unauthorized: No session cookie found.' });
        }
        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);
        const { leagueId, matchId } = req.params;
        const { characterId } = req.body;
        try {
            const isPlayerOfMatch = await LeagueModel.isPartOfTheMatch(currentUserId, matchId);
            if (!isPlayerOfMatch){
                return res.status(403).json({ error: 'You do not have access to this game' });
            }
            if (characterId < 77 && 0 < characterId){
                await LeagueModel.addCharacterInMatch(characterId, matchId, currentUserId);
            }
            else if (characterId === 77){
                const blockedCharactersId = await LeagueModel.getBlockedCharacters(leagueId, currentUserId);
                const allIds = Array.from({ length: 76 }, (_, i) => i + 1);
                const idsPermitidos = allIds.filter(id => !blockedCharactersId.includes(id));

                if (idsPermitidos.length === 0) {
                    return res.status(400).json({ error: "You cannot use more characters bro" });
                }
                const indiceAleatorio = Math.floor(Math.random() * idsPermitidos.length);
                const randomCharacterId = idsPermitidos[indiceAleatorio];
                await LeagueModel.addCharacterInMatch(randomCharacterId, matchId, currentUserId);
            }
            else{
                return res.status(403).json({ error: 'Wrong id' });
            }
            return res.status(200).json({ success: true, message: 'Character locked successfully!' });
        } catch (error) {
            console.error('Error in selectCharacter:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
};

module.exports = leagueController;