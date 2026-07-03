import React from 'react'
import AnimalManagement from '../farm/AnimalManagement'

const MyLivestock = () => {
  // This page wraps AnimalManagement for producer, can add extra producer-specific info here
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8 px-4">
      <AnimalManagement />
    </div>
  )
}

export default MyLivestock
