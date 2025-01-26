import {CreatedPuzzle} from "../models/CreatedPuzzle.js";
import {Puzzle} from "../models/Puzzle.js";
import {User} from "../models/User.js";
import {Op} from "sequelize";
import {getPagination} from "../utils.js";
import {SolvedPuzzle} from "../models/SolvedPuzzle.js";
import {DailyChallenge} from "../models/DailyChallenge.js";
import * as argon2 from "argon2";
import {Achievement} from "../models/Achievement.js";
import {Message} from "../models/Message.js";

export const getPuzzles = async (p, l, s, option) => {
    const {limit, offset} = getPagination(p, l);
    const search = `%${s}%` || '%%';

    return await CreatedPuzzle.findAll({
        include: [{
            model: Puzzle,
            attributes: []
        }, {
            model: User,
            attributes: [],
            where: {username: {[Op.iLike]: option === 'creator' ? search : '%%'}}
        }],
        where: {
            name: {[Op.iLike]: option === 'name' ? search : '%%'},
            is_public: false
        },
        attributes: ['created_id', 'name', 'Puzzle.size', 'User.username', 'Puzzle.excluded_tiles'],
        order: [['date', 'DESC']],
        limit: limit,
        offset: offset,
        raw: true
    });
}

export const getPuzzle = async (created_id) => {
    return await CreatedPuzzle.findOne({
        include: {
            model: Puzzle,
            attributes: []
        },
        where: {
            created_id: created_id
        },
        attributes: {
            include: ['Puzzle.excluded_tiles']
        },
        raw: true
    });
}

export const publishPuzzle = async (created_id, board) => {
    const createdPuzzle = await CreatedPuzzle.findOne({
        where: {created_id: created_id}
    });

    const puzzle = await Puzzle.findOne({
        where: {puzzle_id: createdPuzzle.puzzle_id}
    });

    createdPuzzle.is_public = true;
    puzzle.excluded_tiles = JSON.stringify(board);

    await puzzle.save();
    await createdPuzzle.save();
}

export const deletePuzzle = async (created_id) => {
    const createdPuzzle = await CreatedPuzzle.findOne({
        where: {created_id: created_id}
    });

    return await Puzzle.destroy({where: {puzzle_id: createdPuzzle.puzzle_id}});
}

export const getUsers = async (p, l, s, o) => {
    const search = `%${s}%` || '%%';
    const option = o;
    const {limit, offset} = getPagination(p, l);

    return await User.findAll({
        attributes: {exclude: ['password']},
        where: {
            role: 'user',
            username: {[Op.iLike]: option === 'name' ? search : '%%'},
            email: {[Op.iLike]: option === 'email' ? search : '%%'}
        },
        limit: limit,
        offset: offset,
        order: [['user_id', 'ASC']]
    });
}

export const getUser = async (user_id) => {
    return await User.findOne({
        where: {user_id: user_id}
    });
}

export const getSolvedClassic = async (user_id, p, l) => {
    const {limit, offset} = getPagination(p, l);

    return await SolvedPuzzle.findAll({
        where: {user_id: user_id},
        attributes: ['solved_id', 'points', 'time'],
        order: [['solved_id', 'DESC']],
        offset: offset,
        limit: limit,
    });
}

export const getSolvedChallenge = async (user_id, p, l) => {
    const {limit, offset} = getPagination(p, l);

    return await DailyChallenge.findAll({
        where: {[Op.and]: [{user_id: user_id}, {is_solved: true}]},
        attributes: ['daily_id', 'points', 'time', 'date'],
        order: [['daily_id', 'DESC']],
        offset: offset,
        limit: limit
    });
}

export const getCreatedPuzzles = async (user_id, p, l) => {
    const {limit, offset} = getPagination(p, l);

    return await CreatedPuzzle.findAll({
        include: [{model: Puzzle, attributes: []}, {model: User, attributes: []}],
        where: {user_id: user_id},
        attributes: ['created_id', 'name', 'Puzzle.size', 'User.username', 'date'],
        order: [['date', 'DESC']],
        offset: offset,
        limit: limit,
        raw: true
    });
}

export const deleteClassic = async (userId, contentId) => {
    return await SolvedPuzzle.destroy({
        where: {
            user_id: userId,
            solved_id: contentId
        },
        individualHooks: true
    });
}

export const deleteChallenge = async (userId, contentId) => {
    return await DailyChallenge.destroy({
        where: {
            user_id: userId,
            daily_id: contentId
        },
        individualHooks: true
    });
}

export const deleteCreated = async (userId, contentId) => {
    return await CreatedPuzzle.destroy({
        where: {
            user_id: userId,
            created_id: contentId
        },
        individualHooks: true
    });
}

export const updateUser = async (user) => {
    const updatedUser = await User.findOne({
        where: {user_id: user.user_id}
    });

    updatedUser.email = user.email;
    updatedUser.username = user.username;
    updatedUser.role = user.role;

    if (user.password !== updatedUser.password) {
        updatedUser.password = await argon2.hash(user.password);
    }

    await updatedUser.save();

    return updatedUser;
}

export const deleteUser = async (user_id) => {
    return await User.destroy({
        where: {user_id: user_id}
    });
}

export const getAdmins = async (user_id, p, l, s, o) => {
    const {limit, offset} = getPagination(p, l);
    const search = `%${s}%` || '%%';
    const option = o;

    return await User.findAll({
        attributes: {exclude: ['password']},
        where: {
            role: 'admin',
            [Op.and]: [
                {username: {[Op.iLike]: option === 'name' ? search : '%%'}},
                {user_id: {[Op.ne]: user_id}}
            ],
            email: {[Op.iLike]: option === 'email' ? search : '%%'},
        },
        limit: limit,
        offset: offset
    });
}

export const getAchievements = async (p, l) => {
    const {limit, offset} = getPagination(p, l);

    return await Achievement.findAll({
        limit: limit,
        offset: offset,
        order: [['name', 'ASC']],
        raw: true
    });
}

export const postAchievement = async (achievement) => {
    return await Achievement.create({
        name: achievement.name,
        description: achievement.description,
        type: achievement.type,
        criteria: achievement.criteria
    });
}

export const updateAchievement = async (achievement) => {
    console.log(achievement)
    return await Achievement.update({
        name: achievement.name,
        description: achievement.description,
        type: achievement.type,
        criteria: achievement.criteria
    }, {
        where: {achievement_id: achievement.id}
    });
}

export const getMessages = async (p, l) => {
    const {limit, offset} = getPagination(p, l);

    return await Message.findAll({
        include: {
            model: User,
            attributes: [],
        },
        attributes: {
            exclude: ['user_id'],
            include: ['User.username', 'title', 'content', 'date']
        },
        order: [['date', 'DESC']],
        limit: limit,
        offset: offset,
        raw: true
    });
}

export const deleteAchievement = async (achievementId) => {
    return await Achievement.destroy({
        where: {achievement_id: achievementId}
    });
}

export const deleteMessage = async (messageId) => {
    return await Message.destroy({
        where: {message_id: messageId}
    });
}