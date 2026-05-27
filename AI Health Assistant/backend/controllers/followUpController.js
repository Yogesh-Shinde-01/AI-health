import prisma from '../config/prismaClient.js'

/** Minimal follow-up stub — extend when FollowUp model is added to Prisma. */
export const createFollowUp = async (req, res) => {
  res.status(201).json({
    id: `followup-${Date.now()}`,
    patientId: req.user.id,
    ...req.body,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  })
}

export const listMyFollowUps = async (req, res) => {
  res.json([])
}
