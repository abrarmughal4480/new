import catchAsyncError from '../middlewares/catchAsyncError.js';
import MeetingModel from '../models/meetings.js'; 
import sendResponse from '../utils/sendResponse.js';
import ErrorHandler from '../utils/errorHandler.js';
import sendEmail from '../utils/sendEmail.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary with optimized settings
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT) || 60000,
    chunk_size: parseInt(process.env.CLOUDINARY_CHUNK_SIZE) || 6000000
});

// Helper function to validate file size with faster checking
const validateFileSize = (base64Data, maxSizeMB = 50) => {
    const sizeInBytes = (base64Data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    console.log(`📏 File size: ${sizeInMB.toFixed(2)}MB`);
    
    if (sizeInMB > maxSizeMB) {
        throw new ErrorHandler(`File size (${sizeInMB.toFixed(2)}MB) exceeds maximum (${maxSizeMB}MB)`, 413);
    }
    
    return sizeInMB;
};

// Optimized upload function with retry logic
const uploadToCloudinary = async (data, options, retries = 2) => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            console.log(`🔄 Upload attempt ${attempt}...`);
            const startTime = Date.now();
            
            const result = await cloudinary.uploader.upload(data, {
                ...options,
                timeout: parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT) || 60000
            });
            
            const duration = Date.now() - startTime;
            console.log(`✅ Upload successful in ${duration}ms`);
            
            return result;
        } catch (error) {
            console.error(`❌ Upload attempt ${attempt} failed:`, error.message);
            
            if (attempt <= retries && (error.code === 'ETIMEDOUT' || error.message.includes('timeout'))) {
                console.log(`🔁 Retrying in 1 second... (${retries - attempt + 1} retries left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            throw error;
        }
    }
};

export const create = catchAsyncError(async (req, res, next) => {
    const { meeting_id, name, address, post_code, repair_detail, target_time, recordings, screenshots, update_mode } = req.body;
    const user_id = req.user._id;
    
    const startTime = Date.now();
    console.log(`🎬 [${new Date().toISOString()}] Starting meeting ${update_mode || 'creation'}...`);
    console.log('👤 User ID:', user_id);
    console.log('📋 Meeting data:', { meeting_id, name, address, post_code, repair_detail, target_time });
    console.log('📊 NEW media to upload - Recordings:', recordings?.length || 0, 'Screenshots:', screenshots?.length || 0);
    
    // Validate required fields
    if (!meeting_id) {
        return next(new ErrorHandler("Meeting ID is required", 400));
    }

    // Check if meeting exists
    const existingMeeting = await MeetingModel.findOne({ meeting_id });
    if (existingMeeting) {
        console.log('⚠️ Meeting exists, updating with NEW media only...');
        
        // Ensure the existing meeting has userId field
        if (!existingMeeting.userId) {
            console.log('🔧 Setting missing userId for existing meeting...');
            existingMeeting.userId = user_id;
        }
        
        return await updateMeetingWithNewMediaOnly(existingMeeting, req.body, res, next, user_id);
    }

    // If no existing meeting, proceed with normal creation
    let savedRecordings = [];
    let savedScreenshots = [];
    let uploadPromises = [];

    try {
        // Process recordings with parallel uploads
        if (recordings && recordings.length > 0) {
            console.log('🎥 Processing NEW recordings in parallel...');
            
            const recordingPromises = recordings.map(async (recording, i) => {
                console.log(`📹 Starting NEW recording ${i + 1}/${recordings.length} for user ${user_id}...`);
                
                try {
                    validateFileSize(recording.data, 100);
                    
                    const uploadResult = await uploadToCloudinary(recording.data, {
                        folder: 'videodesk_recordings',
                        public_id: `recording_${meeting_id}_${user_id}_${Date.now()}_${i}`,
                        resource_type: 'video',
                        transformation: [
                            { quality: 'auto:low' },
                            { fetch_format: 'auto' }
                        ]
                    });
                    
                    console.log(`✅ NEW recording ${i + 1} uploaded by user ${user_id}: ${uploadResult.secure_url.substring(0, 50)}...`);
                    
                    return {
                        url: uploadResult.secure_url,
                        cloudinary_id: uploadResult.public_id,
                        timestamp: new Date(recording.timestamp),
                        duration: recording.duration || 0,
                        size: uploadResult.bytes || 0,
                        uploaded_by: user_id
                    };
                } catch (error) {
                    console.error(`❌ NEW recording ${i + 1} failed for user ${user_id}:`, error.message);
                    return null;
                }
            });
            
            uploadPromises.push(...recordingPromises);
        }

        // Process screenshots with parallel uploads
        if (screenshots && screenshots.length > 0) {
            console.log('📸 Processing NEW screenshots in parallel...');
            
            const screenshotPromises = screenshots.map(async (screenshot, i) => {
                console.log(`🖼️ Starting NEW screenshot ${i + 1}/${screenshots.length} for user ${user_id}...`);
                
                try {
                    validateFileSize(screenshot.data, 25);
                    
                    const uploadResult = await uploadToCloudinary(screenshot.data, {
                        folder: 'videodesk_screenshots',
                        public_id: `screenshot_${meeting_id}_${user_id}_${Date.now()}_${i}`,
                        resource_type: 'image',
                        transformation: [
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' },
                            { width: 1280, height: 720, crop: 'limit' }
                        ]
                    });
                    
                    console.log(`✅ NEW screenshot ${i + 1} uploaded by user ${user_id}: ${uploadResult.secure_url.substring(0, 50)}...`);
                    
                    return {
                        url: uploadResult.secure_url,
                        cloudinary_id: uploadResult.public_id,
                        timestamp: new Date(screenshot.timestamp),
                        size: uploadResult.bytes || 0,
                        uploaded_by: user_id
                    };
                } catch (error) {
                    console.error(`❌ NEW screenshot ${i + 1} failed for user ${user_id}:`, error.message);
                    return null;
                }
            });
            
            uploadPromises.push(...screenshotPromises);
        }

        // Wait for all uploads to complete
        console.log(`⏳ Waiting for ${uploadPromises.length} NEW uploads to complete for user ${user_id}...`);
        const uploadResults = await Promise.all(uploadPromises);
        
        // Separate recordings and screenshots
        const recordingCount = recordings?.length || 0;
        savedRecordings = uploadResults.slice(0, recordingCount).filter(result => result !== null);
        savedScreenshots = uploadResults.slice(recordingCount).filter(result => result !== null);

        // Create meeting with userId tracking
        const meeting = await MeetingModel.create({
            meeting_id,
            name,
            address,
            post_code,
            repair_detail,
            target_time,
            owner: user_id,
            userId: user_id,
            created_by: user_id,
            last_updated_by: user_id,
            recordings: savedRecordings,
            screenshots: savedScreenshots,
            total_recordings: savedRecordings.length,
            total_screenshots: savedScreenshots.length
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`✅ Meeting created in ${totalTime}ms with ID: ${meeting._id} by user: ${user_id}`);
        console.log(`📊 Success rates - NEW Recordings: ${savedRecordings.length}/${recordingCount}, NEW Screenshots: ${savedScreenshots.length}/${screenshots?.length || 0}`);
        
        res.status(201).json({
            success: true,
            message: "Meeting created successfully",
            meeting: meeting,
            upload_summary: {
                total_time: `${totalTime}ms`,
                new_recordings_uploaded: savedRecordings.length,
                new_recordings_attempted: recordingCount,
                new_screenshots_uploaded: savedScreenshots.length,
                new_screenshots_attempted: screenshots?.length || 0,
                created_by: user_id
            }
        });

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ Meeting creation failed after ${totalTime}ms for user ${user_id}:`, error.message);
        
        // Cleanup uploaded files
        await cleanupUploadedFiles([...savedRecordings, ...savedScreenshots]);
        
        if (error.statusCode === 413) {
            return next(error);
        }
        
        return next(new ErrorHandler(`Upload failed after ${totalTime}ms. Please try with smaller files.`, 500));
    }
});

// Helper function to update existing meeting with NEW media only
const updateMeetingWithNewMediaOnly = async (meeting, data, res, next, user_id) => {
    const { name, address, post_code, repair_detail, target_time, recordings, screenshots } = data;
    
    console.log(`🔄 Updating existing meeting with NEW media only for user ${user_id}...`);
    console.log(`📋 Current meeting - Existing recordings: ${meeting.recordings.length}, Existing screenshots: ${meeting.screenshots.length}`);
    console.log(`📤 NEW media to upload - Recordings: ${recordings?.length || 0}, Screenshots: ${screenshots?.length || 0}`);
    
    try {
        // Update basic fields
        if (name) meeting.name = name;
        if (address) meeting.address = address;
        if (post_code) meeting.post_code = post_code;
        if (repair_detail) meeting.repair_detail = repair_detail;
        if (target_time) meeting.target_time = target_time;
        
        // Ensure userId is set
        if (!meeting.userId) {
            console.log('🔧 Setting missing userId for existing meeting...');
            meeting.userId = user_id;
        }
        
        meeting.last_updated_by = user_id;

        let newRecordingsCount = 0;
        let newScreenshotsCount = 0;

        // Process ONLY NEW recordings (if any)
        if (recordings && recordings.length > 0) {
            console.log(`🎥 Adding ${recordings.length} NEW recordings to existing meeting for user ${user_id}...`);
            for (let i = 0; i < recordings.length; i++) {
                const recording = recordings[i];
                console.log(`📹 Uploading NEW recording ${i + 1}/${recordings.length} for user ${user_id}...`);
                
                try {
                    validateFileSize(recording.data, 100);
                    
                    const uploadResult = await uploadToCloudinary(recording.data, {
                        folder: 'videodesk_recordings',
                        public_id: `recording_${meeting.meeting_id}_${user_id}_${Date.now()}_${i}`,
                        resource_type: 'video',
                        transformation: [
                            { quality: 'auto:low' },
                            { fetch_format: 'auto' }
                        ]
                    });
                    
                    meeting.recordings.push({
                        url: uploadResult.secure_url,
                        cloudinary_id: uploadResult.public_id,
                        timestamp: new Date(recording.timestamp),
                        duration: recording.duration || 0,
                        size: uploadResult.bytes || 0,
                        uploaded_by: user_id
                    });
                    
                    newRecordingsCount++;
                    console.log(`✅ NEW recording ${i + 1} added successfully`);
                } catch (uploadError) {
                    console.error(`❌ Error uploading NEW recording ${i + 1} for user ${user_id}:`, uploadError);
                    continue;
                }
            }
        } else {
            console.log('ℹ️ No new recordings to upload');
        }

        // Process ONLY NEW screenshots (if any)
        if (screenshots && screenshots.length > 0) {
            console.log(`📸 Adding ${screenshots.length} NEW screenshots to existing meeting for user ${user_id}...`);
            for (let i = 0; i < screenshots.length; i++) {
                const screenshot = screenshots[i];
                console.log(`🖼️ Uploading NEW screenshot ${i + 1}/${screenshots.length} for user ${user_id}...`);
                
                try {
                    validateFileSize(screenshot.data, 25);
                    
                    const uploadResult = await uploadToCloudinary(screenshot.data, {
                        folder: 'videodesk_screenshots',
                        public_id: `screenshot_${meeting.meeting_id}_${user_id}_${Date.now()}_${i}`,
                        resource_type: 'image',
                        transformation: [
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' },
                            { width: 1280, height: 720, crop: 'limit' }
                        ]
                    });
                    
                    meeting.screenshots.push({
                        url: uploadResult.secure_url,
                        cloudinary_id: uploadResult.public_id,
                        timestamp: new Date(screenshot.timestamp),
                        size: uploadResult.bytes || 0,
                        uploaded_by: user_id
                    });
                    
                    newScreenshotsCount++;
                    console.log(`✅ NEW screenshot ${i + 1} added successfully`);
                } catch (uploadError) {
                    console.error(`❌ Error uploading NEW screenshot ${i + 1} for user ${user_id}:`, uploadError);
                    continue;
                }
            }
        } else {
            console.log('ℹ️ No new screenshots to upload');
        }

        // Update totals
        meeting.total_recordings = meeting.recordings.length;
        meeting.total_screenshots = meeting.screenshots.length;

        console.log(`💾 Saving meeting with updated totals...`);
        console.log(`📊 Final counts - Total recordings: ${meeting.total_recordings}, Total screenshots: ${meeting.total_screenshots}`);
        await meeting.save();
        
        console.log(`✅ Meeting updated successfully by user ${user_id}`);
        
        res.status(200).json({
            success: true,
            message: "Meeting updated successfully with new media files only",
            meeting: meeting,
            media_summary: {
                total_recordings_count: meeting.recordings.length,
                total_screenshots_count: meeting.screenshots.length,
                new_recordings_added: newRecordingsCount,
                new_screenshots_added: newScreenshotsCount,
                updated_by: user_id,
                meeting_userId: meeting.userId
            }
        });

    } catch (error) {
        console.error(`❌ Error updating meeting for user ${user_id}:`, error);
        
        if (error.statusCode === 413) {
            return next(error);
        }
        
        return next(new ErrorHandler("Failed to update meeting with new media. Please try with smaller files.", 500));
    }
};

// Optimized cleanup function
const cleanupUploadedFiles = async (uploadedFiles) => {
    if (uploadedFiles.length === 0) return;
    
    console.log(`🧹 Cleaning up ${uploadedFiles.length} files...`);
    
    const deletePromises = uploadedFiles.map(async (file) => {
        try {
            await cloudinary.uploader.destroy(file.cloudinary_id);
            console.log(`🗑️ Deleted: ${file.cloudinary_id}`);
        } catch (error) {
            console.error(`❌ Delete failed: ${file.cloudinary_id}`, error.message);
        }
    });
    
    await Promise.all(deletePromises);
    console.log('✅ Cleanup completed');
};

// Get all meetings with media (filter by userId and archive status)
export const getAllMeetings = catchAsyncError(async (req, res, next) => {
    const user_id = req.user._id;
    const { archived } = req.query; // Get archive filter from query params
    
    console.log(`📋 Fetching meetings for user: ${user_id}, archived: ${archived}`);
    
    const filter = {
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    };
    
    // Add archive filter
    if (archived === 'true') {
        filter.archived = true;
    } else if (archived === 'false') {
        filter.archived = { $ne: true }; // Show non-archived (including null/undefined)
    }
    // If archived is not specified, show all meetings
    
    const meetings = await MeetingModel.find(filter)
        .populate('created_by', 'email')
        .populate('last_updated_by', 'email')
        .populate('archivedBy', 'email');
    
    console.log(`✅ Found ${meetings.length} meetings for user ${user_id} (archived: ${archived})`);
    
    res.status(200).json({
        success: true,
        meetings,
        total_meetings: meetings.length,
        user_id: user_id,
        filter: archived ? `archived: ${archived}` : 'all meetings'
    });
});

// Archive meeting
export const archiveMeeting = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    if (meeting.archived) {
        return next(new ErrorHandler("Meeting is already archived", 400));
    }

    console.log(`📦 Archiving meeting: ${meeting._id} by user ${req.user._id}`);

    meeting.archived = true;
    meeting.archivedAt = new Date();
    meeting.archivedBy = req.user._id;
    meeting.last_updated_by = req.user._id;

    await meeting.save();

    console.log(`✅ Meeting archived successfully: ${meeting._id}`);

    res.status(200).json({
        success: true,
        message: "Meeting archived successfully",
        meeting: meeting
    });
});

// Unarchive meeting
export const unarchiveMeeting = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    if (!meeting.archived) {
        return next(new ErrorHandler("Meeting is not archived", 400));
    }

    console.log(`📤 Unarchiving meeting: ${meeting._id} by user ${req.user._id}`);

    meeting.archived = false;
    meeting.archivedAt = null;
    meeting.archivedBy = null;
    meeting.last_updated_by = req.user._id;

    await meeting.save();

    console.log(`✅ Meeting unarchived successfully: ${meeting._id}`);

    res.status(200).json({
        success: true,
        message: "Meeting unarchived successfully",
        meeting: meeting
    });
});

// Get archived meetings count
export const getArchivedCount = catchAsyncError(async (req, res, next) => {
    const user_id = req.user._id;
    
    const archivedCount = await MeetingModel.countDocuments({
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ],
        archived: true
    });
    
    const totalCount = await MeetingModel.countDocuments({
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });
    
    res.status(200).json({
        success: true,
        archivedCount,
        totalCount,
        activeCount: totalCount - archivedCount
    });
});

// Get meeting by ID
export const getMeetingById = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    sendResponse(true, 200, "Meeting retrieved successfully", res, { meeting });
});

// Get meeting by ID for sharing (public access) - Updated to return history
export const getMeetingForShare = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        meeting_id: req.params.id
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Return limited data for sharing (exclude sensitive info)
    const shareData = {
        meeting_id: meeting.meeting_id,
        name: meeting.name,
        address: meeting.address,
        post_code: meeting.post_code,
        repair_detail: meeting.repair_detail,
        target_time: meeting.target_time,
        recordings: meeting.recordings,
        screenshots: meeting.screenshots,
        createdAt: meeting.createdAt,
        total_recordings: meeting.total_recordings,
        total_screenshots: meeting.total_screenshots,
        total_access_count: meeting.total_access_count || 0,
        access_history: meeting.access_history || []
    };

    res.status(200).json({
        success: true,
        message: "Meeting data retrieved for sharing",
        meeting: shareData
    });
});

// New function to record visitor access
export const recordVisitorAccess = catchAsyncError(async (req, res, next) => {
    const { visitor_name, visitor_email, from_storage = false } = req.body;
    const meetingId = req.params.id;
    
    console.log(`👤 Recording visitor access for meeting: ${meetingId}`, {
        visitor_name,
        visitor_email,
        from_storage
    });

    // Validate required fields
    if (!visitor_name || !visitor_email) {
        return next(new ErrorHandler("Visitor name and email are required", 400));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitor_email)) {
        return next(new ErrorHandler("Please enter a valid email address", 400));
    }

    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Get client information
    const ip_address = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                      (req.connection.socket ? req.connection.socket.remoteAddress : null);
    const user_agent = req.get('User-Agent') || 'Unknown';

    // Check if this visitor already accessed recently (within last hour)
    if (!from_storage) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentAccess = meeting.access_history?.find(access => 
            access.visitor_email === visitor_email.toLowerCase() && 
            access.access_time > oneHourAgo
        );

        if (recentAccess) {
            console.log('🔄 Visitor already accessed recently, updating last access time');
            recentAccess.access_time = new Date();
            await meeting.save();
            
            return res.status(200).json({
                success: true,
                message: "Welcome back! Your access has been refreshed.",
                access_count: meeting.total_access_count,
                visitor_info: {
                    name: visitor_name,
                    email: visitor_email,
                    access_time: recentAccess.access_time,
                    returning_visitor: true
                }
            });
        }
    }

    // Create new visitor access record
    const visitorAccess = {
        visitor_name: visitor_name.trim(),
        visitor_email: visitor_email.trim().toLowerCase(),
        access_time: new Date(),
        ip_address: ip_address,
        user_agent: user_agent,
        from_storage: from_storage || false
    };

    // Add to access history
    if (!meeting.access_history) {
        meeting.access_history = [];
    }
    
    meeting.access_history.push(visitorAccess);
    meeting.total_access_count = (meeting.total_access_count || 0) + 1;

    await meeting.save();

    console.log(`✅ Visitor access recorded successfully:`, {
        meeting_id: meetingId,
        visitor: visitor_name,
        email: visitor_email,
        total_access: meeting.total_access_count,
        from_storage
    });

    res.status(200).json({
        success: true,
        message: from_storage ? 
            "Access restored from saved session" : 
            "Visitor access recorded successfully",
        access_count: meeting.total_access_count,
        visitor_info: {
            name: visitor_name,
            email: visitor_email,
            access_time: visitorAccess.access_time,
            session_expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
        }
    });
});

// Update meeting
export const updateMeeting = catchAsyncError(async (req, res, next) => {
    const { name, address, post_code, repair_detail, target_time } = req.body;
    
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Update fields if provided
    if (name) meeting.name = name;
    if (address) meeting.address = address;
    if (post_code) meeting.post_code = post_code;
    if (repair_detail) meeting.repair_detail = repair_detail;
    if (target_time) meeting.target_time = target_time;
    
    // Ensure userId is set if missing
    if (!meeting.userId) {
        meeting.userId = req.user._id;
    }
    
    meeting.last_updated_by = req.user._id;

    await meeting.save();

    sendResponse(true, 200, "Meeting updated successfully", res);
});

// Delete meeting with all associated media
export const deleteMeeting = catchAsyncError(async (req, res, next) => {
    const meeting = await MeetingModel.findOne({
        _id: req.params.id,
        $or: [
            { owner: req.user._id },
            { userId: req.user._id },
            { created_by: req.user._id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    console.log(`🗑️ [${new Date().toISOString()}] Starting complete meeting deletion: ${meeting._id} by user ${req.user._id}`);
    console.log(`📊 Meeting contains: ${meeting.recordings.length} recordings, ${meeting.screenshots.length} screenshots`);

    let deletedRecordings = 0;
    let deletedScreenshots = 0;
    let failedDeletions = [];

    // Delete all recordings from Cloudinary
    if (meeting.recordings && meeting.recordings.length > 0) {
        console.log(`🎥 Deleting ${meeting.recordings.length} recordings from Cloudinary...`);
        
        const recordingPromises = meeting.recordings.map(async (recording, index) => {
            if (recording.cloudinary_id) {
                try {
                    await deleteFromCloudinaryWithRetry(recording.cloudinary_id, 'video');
                    deletedRecordings++;
                    console.log(`✅ Recording ${index + 1}/${meeting.recordings.length} deleted from Cloudinary`);
                } catch (error) {
                    console.error(`❌ Failed to delete recording ${recording.cloudinary_id}:`, error.message);
                    failedDeletions.push(`recording_${recording.cloudinary_id}`);
                }
            }
        });
        
        await Promise.all(recordingPromises);
    }

    // Delete all screenshots from Cloudinary
    if (meeting.screenshots && meeting.screenshots.length > 0) {
        console.log(`📸 Deleting ${meeting.screenshots.length} screenshots from Cloudinary...`);
        
        const screenshotPromises = meeting.screenshots.map(async (screenshot, index) => {
            if (screenshot.cloudinary_id) {
                try {
                    await deleteFromCloudinaryWithRetry(screenshot.cloudinary_id, 'image');
                    deletedScreenshots++;
                    console.log(`✅ Screenshot ${index + 1}/${meeting.screenshots.length} deleted from Cloudinary`);
                } catch (error) {
                    console.error(`❌ Failed to delete screenshot ${screenshot.cloudinary_id}:`, error.message);
                    failedDeletions.push(`screenshot_${screenshot.cloudinary_id}`);
                }
            }
        });
        
        await Promise.all(screenshotPromises);
    }

    // Delete the meeting document from database
    await meeting.deleteOne();
    
    console.log(`✅ Meeting deleted successfully from database`);
    console.log(`📊 Cloudinary cleanup results - Recordings: ${deletedRecordings}/${meeting.recordings.length}, Screenshots: ${deletedScreenshots}/${meeting.screenshots.length}`);
    
    if (failedDeletions.length > 0) {
        console.log(`⚠️ Some Cloudinary files failed to delete: ${failedDeletions.join(', ')}`);
    }

    res.status(200).json({
        success: true,
        message: "Meeting and all associated media deleted successfully",
        deletion_summary: {
            recordings_deleted: deletedRecordings,
            recordings_total: meeting.recordings.length,
            screenshots_deleted: deletedScreenshots,
            screenshots_total: meeting.screenshots.length,
            failed_cloudinary_deletions: failedDeletions.length,
            meeting_deleted: true
        }
    });
});

// Get meeting by meeting_id (for admin to fetch existing data)
export const getMeetingByMeetingId = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 Looking for meeting with ID: ${id}`);
        
        // Use MeetingModel instead of Meeting
        const meeting = await MeetingModel.findOne({ meeting_id: id });
        
        if (!meeting) {
            console.log(`ℹ️ No meeting found with ID: ${id} (This is normal for new meetings)`);
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
                isNewMeeting: true
            });
        }
        
        console.log(`✅ Found meeting with ID: ${id}`);
        res.status(200).json({
            success: true,
            meeting
        });
        
    } catch (error) {
        console.error('❌ Error in getMeetingByMeetingId:', error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching meeting",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Improved helper function for Cloudinary deletion with better retry logic
const deleteFromCloudinaryWithRetry = async (cloudinaryId, resourceType = 'auto', retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`🔄 Cloudinary delete attempt ${attempt}/${retries} for: ${cloudinaryId} (type: ${resourceType})`);
            const startTime = Date.now();
            
            const result = await cloudinary.uploader.destroy(cloudinaryId, {
                resource_type: resourceType,
                timeout: 15000 // 15 second timeout
            });
            
            const duration = Date.now() - startTime;
            console.log(`✅ Cloudinary delete successful in ${duration}ms, result: ${result.result}`);
            
            if (result.result === 'ok' || result.result === 'not found') {
                return result;
            } else {
                throw new Error(`Cloudinary deletion failed: ${result.result}`);
            }
        } catch (error) {
            console.error(`❌ Cloudinary delete attempt ${attempt} failed:`, error.message);
            
            if (attempt < retries) {
                const delay = attempt * 2000; // Increasing delay: 2s, 4s, 6s
                console.log(`🔁 Retrying Cloudinary delete in ${delay}ms... (${retries - attempt} retries left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            console.error(`❌ All Cloudinary delete attempts failed for ${cloudinaryId}`);
            throw error;
        }
    }
};

// Delete individual recording with guaranteed Cloudinary removal
export const deleteRecording = catchAsyncError(async (req, res, next) => {
    const { meetingId, recordingId } = req.params;
    const user_id = req.user._id;
    
    console.log(`🗑️ [${new Date().toISOString()}] Starting recording deletion: ${recordingId} from meeting ${meetingId} by user ${user_id}`);
    
    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId,
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Find the recording to delete
    const recordingIndex = meeting.recordings.findIndex(rec => rec._id.toString() === recordingId);
    
    if (recordingIndex === -1) {
        return next(new ErrorHandler("Recording not found", 404));
    }

    const recording = meeting.recordings[recordingIndex];
    console.log(`📹 Found recording to delete:`, {
        cloudinary_id: recording.cloudinary_id,
        url: recording.url,
        size: recording.size
    });
    
    let cloudinaryDeleted = false;
    
    try {
        // First, delete from Cloudinary with aggressive retry
        if (recording.cloudinary_id) {
            console.log(`☁️ Attempting to delete from Cloudinary: ${recording.cloudinary_id}`);
            
            try {
                await deleteFromCloudinaryWithRetry(recording.cloudinary_id, 'video');
                cloudinaryDeleted = true;
                console.log(`✅ Successfully deleted from Cloudinary: ${recording.cloudinary_id}`);
            } catch (cloudinaryError) {
                console.error(`❌ Failed to delete from Cloudinary after all retries:`, cloudinaryError.message);
                // Continue with database deletion even if Cloudinary fails
                cloudinaryDeleted = false;
            }
        } else {
            console.log(`⚠️ No Cloudinary ID found for recording`);
            cloudinaryDeleted = true; // No Cloudinary file to delete
        }
        
        // Remove from database
        meeting.recordings.splice(recordingIndex, 1);
        meeting.total_recordings = meeting.recordings.length;
        meeting.last_updated_by = user_id;
        
        await meeting.save();
        
        console.log(`✅ Recording deleted from database successfully. Total recordings: ${meeting.total_recordings}`);
        
        res.status(200).json({
            success: true,
            message: cloudinaryDeleted 
                ? "Recording deleted successfully from both database and cloud storage" 
                : "Recording deleted from database, but cloud storage deletion failed",
            total_recordings: meeting.total_recordings,
            cloudinary_deleted: cloudinaryDeleted
        });
        
    } catch (error) {
        console.error(`❌ Error in recording deletion process:`, error);
        return next(new ErrorHandler("Failed to delete recording", 500));
    }
});

// Delete individual screenshot with guaranteed Cloudinary removal
export const deleteScreenshot = catchAsyncError(async (req, res, next) => {
    const { meetingId, screenshotId } = req.params;
    const user_id = req.user._id;
    
    console.log(`🗑️ [${new Date().toISOString()}] Starting screenshot deletion: ${screenshotId} from meeting ${meetingId} by user ${user_id}`);
    
    const meeting = await MeetingModel.findOne({
        meeting_id: meetingId,
        $or: [
            { owner: user_id },
            { userId: user_id },
            { created_by: user_id }
        ]
    });

    if (!meeting) {
        return next(new ErrorHandler("Meeting not found", 404));
    }

    // Find the screenshot to delete
    const screenshotIndex = meeting.screenshots.findIndex(screenshot => screenshot._id.toString() === screenshotId);
    
    if (screenshotIndex === -1) {
        return next(new ErrorHandler("Screenshot not found", 404));
    }

    const screenshot = meeting.screenshots[screenshotIndex];
    console.log(`📸 Found screenshot to delete:`, {
        cloudinary_id: screenshot.cloudinary_id,
        url: screenshot.url,
        size: screenshot.size
    });
    
    let cloudinaryDeleted = false;
    
    try {
        // First, delete from Cloudinary with aggressive retry
        if (screenshot.cloudinary_id) {
            console.log(`☁️ Attempting to delete from Cloudinary: ${screenshot.cloudinary_id}`);
            
            try {
                await deleteFromCloudinaryWithRetry(screenshot.cloudinary_id, 'image');
                cloudinaryDeleted = true;
                console.log(`✅ Successfully deleted from Cloudinary: ${screenshot.cloudinary_id}`);
            } catch (cloudinaryError) {
                console.error(`❌ Failed to delete from Cloudinary after all retries:`, cloudinaryError.message);
                // Continue with database deletion even if Cloudinary fails
                cloudinaryDeleted = false;
            }
        } else {
            console.log(`⚠️ No Cloudinary ID found for screenshot`);
            cloudinaryDeleted = true; // No Cloudinary file to delete
        }
        
        // Remove from database
        meeting.screenshots.splice(screenshotIndex, 1);
        meeting.total_screenshots = meeting.screenshots.length;
        meeting.last_updated_by = user_id;
        
        await meeting.save();
        
        console.log(`✅ Screenshot deleted from database successfully. Total screenshots: ${meeting.total_screenshots}`);
        
        res.status(200).json({
            success: true,
            message: cloudinaryDeleted 
                ? "Screenshot deleted successfully from both database and cloud storage" 
                : "Screenshot deleted from database, but cloud storage deletion failed",
            total_screenshots: meeting.total_screenshots,
            cloudinary_deleted: cloudinaryDeleted
        });
        
    } catch (error) {
        console.error(`❌ Error in screenshot deletion process:`, error);
        return next(new ErrorHandler("Failed to delete screenshot", 500));
    }
});


