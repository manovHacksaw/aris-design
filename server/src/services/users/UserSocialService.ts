import { prisma } from '../../lib/prisma';

export class UserSocialService {
    /**
     * Follow a user
     */
    static async followUser(followerId: string, followingId: string) {
        if (followerId === followingId) {
            return { success: false, message: 'Cannot follow yourself' };
        }

        const existingFollow = await prisma.userFollowers.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (existingFollow) {
            return { success: false, message: 'Already following this user' };
        }

        await prisma.userFollowers.create({
            data: {
                followerId,
                followingId,
            },
        });

        return { success: true, message: 'Successfully followed user' };
    }

    /**
     * Unfollow a user
     */
    static async unfollowUser(followerId: string, followingId: string) {
        const existingFollow = await prisma.userFollowers.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (!existingFollow) {
            return { success: false, message: 'Not following this user' };
        }

        await prisma.userFollowers.delete({
            where: {
                id: existingFollow.id,
            },
        });

        return { success: true, message: 'Successfully unfollowed user' };
    }

    /**
     * Get user followers
     */
    static async getFollowers(userId: string) {
        const followers = await prisma.userFollowers.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        bio: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return followers.map(f => ({
            ...f.follower,
            followedAt: f.createdAt,
        }));
    }

    /**
     * Get users followed by user (following)
     */
    static async getFollowing(userId: string) {
        const following = await prisma.userFollowers.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        bio: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return following.map(f => ({
            ...f.following,
            followedAt: f.createdAt,
        }));
    }
}
