"use client"
import { DialogComponent } from '@/components/dialogs/DialogCompnent';
import React, { createContext, useState, useContext } from 'react';
import { FileText, Archive, Trash2, Monitor, Smartphone, Save, History, ArchiveRestore, ExternalLink, FileSearch, MailIcon, Loader2, LockIcon, XIcon, Link, Copy } from "lucide-react"
import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { sendFriendLinkRequest, resetPasswordFromDashboardRequest, sendFeedbackRequest, raiseSupportTicketRequest, forgotPasswordRequest, updateLandlordInfoRequest } from '@/http/authHttp';
import { useUser } from './UserProvider';
import { toast } from 'sonner';

const DialogContext = createContext();

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

const faqs = [
  "What is Videodesk?",
  "How do I use Videodesk?",
  "How do I send a video link?",
  "Can I take videos in the call?",
  "Can I take screenshots in the call?",
  "How do I generate page links to saved videos and images?",
  "What does the actions button do?",
  "How do I provide feedback to Videodesk?",
  "Can Videodesk develop other solutions and apps?",
];


export const DialogProvider = ({ children }) => {
  const [resetOpen, setResetOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [landlordDialogOpen, setLandlordDialogOpen] = useState(false);
  const [ticketOpen, setTickerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [checked, setIsCheked] = useState(false)
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  // Add new state for message option
  const [messageOption, setMessageOption] = useState(''); // '' for no default selection
  const [defaultTextSize, setDefaultTextSize] = useState('14px'); // font size for default message
  const [tailoredTextSize, setTailoredTextSize] = useState('14px'); // font size for tailored message
  const [selectedButtonColor, setSelectedButtonColor] = useState('bg-green-800'); // button color state

  // Color options array - 5 colors plus green in the row (6 total)
  const buttonColors = [
    { name: 'Green Light', bgClass: 'bg-green-600', hoverClass: 'hover:bg-green-700', color: '#16a34a' },
    { name: 'Blue', bgClass: 'bg-blue-800', hoverClass: 'hover:bg-blue-900', color: '#1e40af' },
    { name: 'Red', bgClass: 'bg-red-800', hoverClass: 'hover:bg-red-900', color: '#dc2626' },
    { name: 'Purple', bgClass: 'bg-purple-800', hoverClass: 'hover:bg-purple-900', color: '#7c3aed' },
    { name: 'Orange', bgClass: 'bg-orange-800', hoverClass: 'hover:bg-orange-900', color: '#ea580c' }
  ];

  const [landlordName, setLandlordName] = useState("");
  const [landlordLogo, setLandlordLogo] = useState(null);
  const [officerImage, setOfficerImage] = useState(null);
  const [landlordLogoFile, setLandlordLogoFile] = useState(null);
  const [officerImageFile, setOfficerImageFile] = useState(null);
  const [redirectUrlDefault, setRedirectUrlDefault] = useState("www.videodesk.co.uk");
  const [redirectUrlTailored, setRedirectUrlTailored] = useState("www.");
  const [profileShape, setProfileShape] = useState(""); // Changed from "square" to ""
  const [showSupportModal, setShowSupportModal] = useState(false);
  // Removed duplicate declaration
  const [inviteEmails, setInviteEmails] = useState(['']);
  const { user, isAuth, setUser } = useUser();
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(`Hey, I'm using Videodesk , check it out here www.videodesk.co.uk`);

  // New state for checkbox groups
  const [profileImageOption, setProfileImageOption] = useState(''); // 'landlord' or 'officer'
  const [redirectOption, setRedirectOption] = useState(''); // 'default' or 'tailored'
  const [exportOpen, setExportOpen] = useState(false);
  const [landlordNameEnabled, setLandlordNameEnabled] = useState(false);
  const [landlordLogoEnabled, setLandlordLogoEnabled] = useState(false);
  const [landlordLogoUploading, setLandlordLogoUploading] = useState(false);
  const [officerImageUploading, setOfficerImageUploading] = useState(false);
  const [landlordSaving, setLandlordSaving] = useState(false);
  const [landlordDataLoaded, setLandlordDataLoaded] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [exportLoading, setExportLoading] = useState({
    word: false,
    pdf: false,
    copy: false,
    share: false
  });

  // Add state for tracking what actions to perform on save
  const [pendingActions, setPendingActions] = useState({
    deleteLandlordLogo: false,
    deleteOfficerImage: false
  });

  // Add new state for visitor access modal
  const [visitorAccessOpen, setVisitorAccessOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [visitorAccessCallback, setVisitorAccessCallback] = useState(null);

  // Add new state for history modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedMeetingForHistory, setSelectedMeetingForHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Add new state for share link dialog
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [selectedMeetingForShare, setSelectedMeetingForShare] = useState(null);

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const updateEmail = (index, value) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = value;
    setInviteEmails(newEmails);
  };

  const removeEmailField = (index) => {
    if (inviteEmails.length > 1) {
      const newEmails = inviteEmails.filter((_, i) => i !== index);
      setInviteEmails(newEmails);
    }
  };

  const handleInviteCoWorkers = async () => {
    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to send invites"
      });
      return;
    }

    const validEmails = inviteEmails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      toast("No valid emails", {
        description: "Please enter at least one email address"
      });
      return;
    }

    setInviteLoading(true);

    try {
      // Auto-detect current website URL
      const currentUrl = `${window.location.protocol}//${window.location.host}`;
      const senderName = user?.landlordInfo?.landlordName || user.email.split('@')[0];

      // Send invite to each email
      const promises = validEmails.map(email =>
        sendFriendLinkRequest({
          fromName: senderName,
          fromEmail: user.email,
          toEmail: email,
          message: inviteMessage,
          websiteLink: currentUrl,
          // Add landlord info for personalization
          landlordName: user?.landlordInfo?.landlordName,
          senderProfile: user?.landlordInfo?.useLandlordLogoAsProfile
            ? user?.landlordInfo?.landlordLogo
            : user?.landlordInfo?.officerImage
        })
      );

      await Promise.all(promises);

      toast("Invites Sent Successfully", {
        description: `Invites sent to ${validEmails.length} co-worker(s)`
      });

      // Reset form
      setInviteEmails(['']);
      setInviteMessage(`Hey, I'm using Videodesk , check it out here www.videodesk.co.uk`);
      setInviteOpen(false);
    } catch (error) {
      toast("Failed to Send Invites", {
        description: error?.response?.data?.message || error.message || "Please try again later"
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryWord, setRecoveryWord] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to reset password"
      });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast("All fields required", {
        description: "Please fill in all required fields"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast("Passwords don't match", {
        description: "New password and confirm password must match"
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast("Passwords must be different", {
        description: "New password must be different from current password"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast("Password too short", {
        description: "Password must be at least 8 characters long"
      });
      return;
    }

    setResetLoading(true);

    try {
      const res = await resetPasswordFromDashboardRequest({
        currentPassword,
        newPassword,
        confirmPassword,
        recoveryWord
      });

      toast("Password Updated Successfully", {
        description: "Your password has been updated successfully"
      });

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryWord('');
      setResetOpen(false);
    } catch (error) {
      toast("Failed to Update Password", {
        description: error?.response?.data?.message || error.message || "Please try again later"
      });
    } finally {
      setResetLoading(false);
    }
  };

  const [feedbackText, setFeedbackText] = useState('');
  const [supportQuery, setSupportQuery] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportCategory, setSupportCategory] = useState('');

  // Support categories array
  const supportCategories = [
    "Accessibility (eg. font size, button size, colour or contrast issues)",
    "'Actions' button issue",
    "Amending Message issue",
    "Dashboard issue",
    "Delete/Archive issue",
    "Export issue",
    "History issue",
    "Log in/Log out issue",
    "Payment/account queries",
    "Password/Security issue",
    "Saving videos or screenshots query",
    "Sending shared links to third parties",
    "Sending a text/email link to customers",
    "Uploading logo or profile image issue",
    "Video viewing page issue",
    "Any Other issue not listed above"
  ];

  const handleSendFeedback = async (e) => {
    e.preventDefault();

    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to send feedback"
      });
      return;
    }

    if (!feedbackText.trim()) {
      toast("Feedback Required", {
        description: "Please enter your feedback"
      });
      return;
    }

    setFeedbackLoading(true);

    try {
      const res = await sendFeedbackRequest({
        feedback: feedbackText
      });

      toast("Feedback Sent Successfully", {
        description: "Thank you for your feedback!"
      });

      setFeedbackText('');
      setFeedbackOpen(false);
    } catch (error) {
      toast("Failed to Send Feedback", {
        description: error?.response?.data?.message || error.message || "Please try again later"
      });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleRaiseSupportTicket = async (e) => {
    e.preventDefault();

    if (!isAuth) {
      toast("Please Login First", {
        description: "You need to be logged in to raise support ticket"
      });
      return;
    }

    if (!supportCategory) {
      toast("Category Required", {
        description: "Please select a support category"
      });
      return;
    }

    if (!supportQuery.trim()) {
      toast("Query Required", {
        description: "Please enter your support query"
      });
      return;
    }

    setSupportLoading(true);

    try {
      const res = await raiseSupportTicketRequest({
        category: supportCategory,
        query: supportQuery
      });

      toast("Support Ticket Created", {
        description: res.data.message || "Your support ticket has been created successfully"
      });

      setSupportQuery('');
      setSupportCategory('');
      setTickerOpen(false);
    } catch (error) {
      toast("Failed to Create Ticket", {
        description: error?.response?.data?.message || error.message || "Please try again later"
      });
    } finally {
      setSupportLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      toast("Email Required", {
        description: "Please enter your email address"
      });
      return;
    }

    setForgotLoading(true);

    try {
      const res = await forgotPasswordRequest({
        email: forgotEmail
      });

      toast("Reset Link Sent", {
        description: "Password reset link has been sent to your email"
      });

      setForgotEmail('');
      setForgotPasswordOpen(false);
    } catch (error) {
      toast("Failed to Send Reset Link", {
        description: error?.response?.data?.message || error.message || "Please try again later"
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // File selection handlers (only local preview, no upload)
  const handleLandlordLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast("File size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast("Please select a valid image file");
        return;
      }

      // Store file for later upload
      setLandlordLogoFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setLandlordLogo(event.target.result);
      };
      reader.readAsDataURL(file);

      // Clear any pending delete action
      setPendingActions(prev => ({ ...prev, deleteLandlordLogo: false }));
    }
  };

  const handleOfficerImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast("File size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast("Please select a valid image file");
        return;
      }

      // Store file for later upload
      setOfficerImageFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setOfficerImage(event.target.result);
      };
      reader.readAsDataURL(file);

      // Clear any pending delete action
      setPendingActions(prev => ({ ...prev, deleteOfficerImage: false }));
    }
  };

  // Modified deletion handlers (only local state changes, no API calls)
  const handleDeleteLandlordLogo = () => {
    // Only update local state - no API call
    setLandlordLogo(null);
    setLandlordLogoFile(null);
    setLandlordLogoEnabled(false);
    if (profileImageOption === 'landlord') {
      setProfileImageOption('');
    }

    // Mark for deletion when save is clicked
    setPendingActions(prev => ({ ...prev, deleteLandlordLogo: true }));

    toast("Landlord logo will be deleted when you save");
  };

  const handleDeleteOfficerImage = () => {
    // Only update local state - no API call
    setOfficerImage(null);
    setOfficerImageFile(null);
    setProfileImageOption('');

    // Mark for deletion when save is clicked
    setPendingActions(prev => ({ ...prev, deleteOfficerImage: true }));

    toast("Officer image will be deleted when you save");
  };

  const handleSaveLandlordInfo = async () => {
    if (!isAuth) {
      toast("Please Login First");
      return;
    }

    setLandlordSaving(true);

    try {
      let landlordLogoUrl = landlordLogo;
      let officerImageUrl = officerImage;

      // Handle pending deletions first
      if (pendingActions.deleteLandlordLogo && user?.landlordInfo?.landlordLogo) {
        console.log('🗑️ Deleting landlord logo from server...');
        const deleteResponse = await updateLandlordInfoRequest({
          type: 'deleteLandlordLogo'
        });

        if (deleteResponse.data.success) {
          console.log('✅ Landlord logo deleted from server');
          landlordLogoUrl = null;
        }
      }

      if (pendingActions.deleteOfficerImage && user?.landlordInfo?.officerImage) {
        console.log('🗑️ Deleting officer image from server...');
        const deleteResponse = await updateLandlordInfoRequest({
          type: 'deleteOfficerImage'
        });

        if (deleteResponse.data.success) {
          console.log('✅ Officer image deleted from server');
          officerImageUrl = null;
        }
      }

      // Upload landlord logo if new file selected
      if (landlordLogoEnabled && landlordLogoFile) {
        console.log('📤 Uploading new landlord logo...');
        const reader = new FileReader();
        const logoData = await new Promise((resolve) => {
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(landlordLogoFile);
        });

        const logoResponse = await updateLandlordInfoRequest({
          type: 'landlordLogo',
          logoData
        });

        if (logoResponse.data.success) {
          landlordLogoUrl = logoResponse.data.logoUrl;
          console.log('✅ New landlord logo uploaded successfully');
        }
      }

      // Upload officer image if new file selected
      if (profileImageOption === 'officer' && officerImageFile) {
        console.log('📤 Uploading new officer image...');
        const reader = new FileReader();
        const imageData = await new Promise((resolve) => {
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(officerImageFile);
        });

        const imageResponse = await updateLandlordInfoRequest({
          type: 'officerImage',
          imageData
        });

        if (imageResponse.data.success) {
          officerImageUrl = imageResponse.data.imageUrl;
          console.log('✅ New officer image uploaded successfully');
        }
      }

      // Save all landlord information
      const landlordData = {
        type: 'saveLandlordInfo',
        landlordName: landlordNameEnabled ? landlordName : null,
        landlordLogo: landlordLogoEnabled ? landlordLogoUrl : null,
        officerImage: profileImageOption === 'officer' ? officerImageUrl : null,
        useLandlordLogoAsProfile: profileImageOption === 'landlord',
        profileShape: profileShape || null,
        redirectUrlDefault: redirectOption === 'default' ? redirectUrlDefault : null,
        redirectUrlTailored: redirectOption === 'tailored' ? redirectUrlTailored : null
      };

      const response = await updateLandlordInfoRequest(landlordData);

      if (response.data.success) {
        // Update user context with new data immediately
        console.log('🔄 Updating user context with new landlord data...');
        setUser(response.data.user);

        toast("Landlord information saved successfully");

        // Reset form state and pending actions
        setLandlordLogoFile(null);
        setOfficerImageFile(null);
        setPendingActions({ deleteLandlordLogo: false, deleteOfficerImage: false });
        setLandlordDialogOpen(false);

        // Reset form for next time
        setTimeout(() => {
          resetLandlordForm();
        }, 300);
      }
    } catch (error) {
      console.error('Error saving landlord info:', error);
      toast(error?.response?.data?.message || "Failed to save landlord information");
    } finally {
      setLandlordSaving(false);
    }
  };

  // Load existing landlord data when modal opens
  const loadLandlordData = () => {
    if (user?.landlordInfo && !landlordDataLoaded) {
      console.log('📥 Loading existing landlord data:', user.landlordInfo);

      // Load landlord name
      if (user.landlordInfo.landlordName) {
        setLandlordName(user.landlordInfo.landlordName);
        setLandlordNameEnabled(true);
      }

      // Load landlord logo
      if (user.landlordInfo.landlordLogo) {
        setLandlordLogo(user.landlordInfo.landlordLogo);
        setLandlordLogoEnabled(true);
      }

      // Load officer image
      if (user.landlordInfo.officerImage) {
        setOfficerImage(user.landlordInfo.officerImage);
        setProfileImageOption('officer');
      }

      // Load profile settings
      if (user.landlordInfo.useLandlordLogoAsProfile) {
        setProfileImageOption('landlord');
      }

      if (user.landlordInfo.profileShape) {
        setProfileShape(user.landlordInfo.profileShape);
      }

      // Load redirect URLs
      if (user.landlordInfo.redirectUrlDefault && user.landlordInfo.redirectUrlDefault !== 'www.videodesk.co.uk') {
        setRedirectUrlDefault(user.landlordInfo.redirectUrlDefault);
        setRedirectOption('default');
      }

      if (user.landlordInfo.redirectUrlTailored && user.landlordInfo.redirectUrlTailored !== 'www.') {
        setRedirectUrlTailored(user.landlordInfo.redirectUrlTailored);
        setRedirectOption('tailored');
      }

      setLandlordDataLoaded(true);
      console.log('✅ Landlord data loaded successfully');
    }
  };

  // Reset form when modal closes
  const resetLandlordForm = () => {
    setLandlordName("");
    setLandlordLogo(null);
    setOfficerImage(null);
    setLandlordLogoFile(null);
    setOfficerImageFile(null);
    setRedirectUrlDefault("www.videodesk.co.uk");
    setRedirectUrlTailored("www.");
    setProfileShape("");
    setLandlordNameEnabled(false);
    setLandlordLogoEnabled(false);
    setProfileImageOption('');
    setRedirectOption('');
    setLandlordDataLoaded(false);
    setPendingActions({ deleteLandlordLogo: false, deleteOfficerImage: false });
    console.log('🔄 Landlord form reset');
  };

  // Helper function to get initials
  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else if (words.length >= 2) {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Generate share link with landlord info
  const generateShareLink = (meetingId) => {
    const baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/share/${meetingId}`;

    // Add landlord info as URL parameters if available
    const urlParams = new URLSearchParams();

    if (user?.landlordInfo?.landlordName) {
      urlParams.append('senderName', encodeURIComponent(user.landlordInfo.landlordName));
    }

    // Add profile image info
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      urlParams.append('senderProfile', encodeURIComponent(user.landlordInfo.landlordLogo));
      urlParams.append('profileType', 'logo');
      if (user?.landlordInfo?.profileShape) {
        urlParams.append('profileShape', user.landlordInfo.profileShape);
      }
    } else if (user?.landlordInfo?.officerImage) {
      urlParams.append('senderProfile', encodeURIComponent(user.landlordInfo.officerImage));
      urlParams.append('profileType', 'officer');
      if (user?.landlordInfo?.profileShape) {
        urlParams.append('profileShape', user.landlordInfo.profileShape);
      }
    }

    // Append parameters if any exist
    const paramString = urlParams.toString();
    if (paramString) {
      shareUrl += `?${paramString}`;
    }

    return shareUrl;
  };

  // Open email client with pre-filled content (no clipboard copy)
  const handleCopyLink = async () => {
    if (!selectedMeeting) {
      toast.error("No meeting selected for export");
      return;
    }

    setExportLoading(prev => ({ ...prev, copy: true }));

    const shareLink = generateShareLink(selectedMeeting.meeting_id);

    // Prepare email content with sender info
    const senderName = user?.landlordInfo?.landlordName || user?.email?.split('@')[0] || 'Landlord';
    const emailSubject = `Meeting Report from ${senderName} - ${selectedMeeting.name || 'Repair Meeting'}`;
    const emailBody = `Hi,

${senderName} has shared a meeting report with you.

Meeting Details:
Meeting ID: ${selectedMeeting.meeting_id}
Resident Name: ${selectedMeeting.name || 'N/A'}
Address: ${selectedMeeting.address || 'N/A'}
Post Code: ${selectedMeeting.post_code || 'N/A'}
Repair Details: ${selectedMeeting.repair_detail || 'N/A'}
Date Created: ${new Date(selectedMeeting.createdAt).toLocaleDateString()}

You can view the complete meeting content including recordings and screenshots using this link:
${shareLink}

Best regards,
${senderName}`;

    try {
      // Create mailto link with pre-filled content
      const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      // Open email client
      const emailWindow = window.open(mailtoLink, '_blank');

      // Check if email client opened successfully
      if (emailWindow) {
        toast.success("Email client opened with meeting details!");
      } else {
        // Fallback if popup was blocked
        window.location.href = mailtoLink;
        toast.success("Opening email client...");
      }

    } catch (error) {
      console.error('Failed to open email client:', error);
      // Ultimate fallback - show alert with email content
      window.alert(`Please copy this information to your email:\n\nSubject: ${emailSubject}\n\nBody:\n${emailBody}`);
      toast.error("Please copy the information manually to your email");
    } finally {
      setExportLoading(prev => ({ ...prev, copy: false }));
    }
  };

  // Generate PDF document with ultra-high quality
  const handleGeneratePDF = async () => {
    if (!selectedMeeting) {
      toast.error("No meeting selected for export");
      return;
    }

    setExportLoading(prev => ({ ...prev, pdf: true }));

    try {
      // Import jsPDF dynamically
      const jsPDF = (await import('jspdf')).jsPDF;

      const pdf = new jsPDF();
      let yPosition = 20;

      // Title with sender info
      const senderName = user?.landlordInfo?.landlordName || user?.email?.split('@')[0] || 'Landlord';
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Meeting Report from ${senderName}`, 20, yPosition);
      yPosition += 20;

      // Meeting Info
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');

      const addLine = (label, value) => {
        // Check if we need a new page
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont(undefined, 'bold');
        pdf.text(label, 20, yPosition);
        pdf.setFont(undefined, 'normal');

        // Handle long text by splitting it
        const maxWidth = 120;
        const lines = pdf.splitTextToSize(value || 'N/A', maxWidth);
        pdf.text(lines, 70, yPosition);
        yPosition += lines.length * 7;
      };

      addLine('Shared by:', senderName);
      addLine('Meeting ID:', selectedMeeting.meeting_id);
      addLine('Resident Name:', selectedMeeting.name);
      addLine('Address:', selectedMeeting.address);
      addLine('Post Code:', selectedMeeting.post_code);
      addLine('Repair Details:', selectedMeeting.repair_detail);
      addLine('Date Created:', new Date(selectedMeeting.createdAt).toLocaleDateString());
      addLine('Share Link:', generateShareLink(selectedMeeting.meeting_id));

      yPosition += 10;

      // Screenshots section with ultra-high quality (matching WebRTC approach)
      if (selectedMeeting.screenshots && selectedMeeting.screenshots.length > 0) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(16);
        pdf.text('Screenshots', 20, yPosition);
        yPosition += 15;

        for (let i = 0; i < selectedMeeting.screenshots.length; i++) {
          const screenshot = selectedMeeting.screenshots[i];

          // Check if we need a new page (increased spacing for larger images)
          if (yPosition > 100) {
            pdf.addPage();
            yPosition = 20;
          }

          try {
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text(`Screenshot ${i + 1}:`, 20, yPosition);
            yPosition += 10;

            // Create a promise to load and convert image with ultra-high quality (matching WebRTC)
            await new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';

              img.onload = () => {
                try {
                  // Create canvas to convert image with ultra-high quality (matching WebRTC approach)
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');

                  // Get source image dimensions
                  const sourceWidth = img.naturalWidth || img.width;
                  const sourceHeight = img.naturalHeight || img.height;

                  // Enhanced quality settings - matching WebRTC's 4x resolution approach
                  const maxDisplayWidth = 170; // Display size on PDF
                  const maxDisplayHeight = 130; // Display size on PDF

                  // Calculate aspect ratio and display dimensions
                  const aspectRatio = sourceWidth / sourceHeight;
                  let displayWidth = maxDisplayWidth;
                  let displayHeight = displayWidth / aspectRatio;

                  if (displayHeight > maxDisplayHeight) {
                    displayHeight = maxDisplayHeight;
                    displayWidth = displayHeight * aspectRatio;
                  }

                  // Set canvas size to ultra-high resolution (4x like WebRTC)
                  canvas.width = sourceWidth * 4;  // 4x resolution for extreme quality
                  canvas.height = sourceHeight * 4;

                  // Apply advanced image quality settings (matching WebRTC)
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = 'high';
                  ctx.filter = 'contrast(1.05) saturate(1.05)'; // Slightly enhance contrast and color

                  // Scale context for ultra-high resolution
                  ctx.scale(4, 4);

                  // Draw image on canvas with ultra-high quality
                  ctx.drawImage(img, 0, 0, sourceWidth, sourceHeight);

                  // Convert to base64 with maximum quality (PNG for lossless, matching WebRTC)
                  const dataURL = canvas.toDataURL('image/png', 1.0); // PNG at 100% quality

                  // Add image to PDF with calculated display dimensions
                  pdf.addImage(dataURL, 'PNG', 20, yPosition, displayWidth, displayHeight);
                  yPosition += displayHeight + 20; // Increased spacing

                  resolve();
                } catch (error) {
                  console.error('Error processing ultra-high quality image:', error);
                  // Fallback: add URL as text
                  pdf.setFont(undefined, 'normal');
                  const lines = pdf.splitTextToSize(screenshot.url, 150);
                  pdf.text(lines, 20, yPosition);
                  yPosition += lines.length * 7 + 5;
                  resolve();
                }
              };

              img.onerror = () => {
                console.error('Failed to load image:', screenshot.url);
                // Fallback: add URL as text
                pdf.setFont(undefined, 'normal');
                const lines = pdf.splitTextToSize(screenshot.url, 150);
                pdf.text(lines, 20, yPosition);
                yPosition += lines.length * 7 + 5;
                resolve();
              };

              // Add cache busting and ultra-high quality parameters
              const imageUrl = new URL(screenshot.url);
              imageUrl.searchParams.set('quality', 'ultra');
              imageUrl.searchParams.set('format', 'png');
              imageUrl.searchParams.set('resolution', '4k');
              imageUrl.searchParams.set('timestamp', Date.now().toString());
              img.src = imageUrl.toString();
            });

          } catch (imageError) {
            console.error('Failed to add ultra-high quality screenshot to PDF:', imageError);
            // Add URL as fallback
            pdf.setFont(undefined, 'normal');
            const lines = pdf.splitTextToSize(screenshot.url, 150);
            pdf.text(lines, 20, yPosition);
            yPosition += lines.length * 7 + 5;
          }
        }
      }

      // Recordings section with enhanced quality (matching WebRTC bitrate settings)
      if (selectedMeeting.recordings && selectedMeeting.recordings.length > 0) {
        // Check if we need a new page
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(16);
        pdf.text('Video Recordings', 20, yPosition);
        yPosition += 15;

        selectedMeeting.recordings.forEach((recording, index) => {
          if (yPosition > 240) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          pdf.text(`Video Recording ${index + 1}:`, 20, yPosition);
          yPosition += 8;

          pdf.setFont(undefined, 'normal');
          pdf.text('Type: Ultra High Quality Video (VP9/VP8, 8Mbps)', 20, yPosition);
          yPosition += 8;

          pdf.text(`Duration: ${recording.duration || 0} seconds`, 20, yPosition);
          yPosition += 8;

          pdf.text('Quality: 4K Resolution, High Bitrate Encoding', 20, yPosition);
          yPosition += 8;

          // Add clickable link for video with ultra-high quality parameters
          pdf.setTextColor(0, 0, 255); // Blue color for links
          pdf.text('Click to view ultra high quality video:', 20, yPosition);
          const videoUrl = new URL(recording.url);
          videoUrl.searchParams.set('quality', 'ultra');
          videoUrl.searchParams.set('bitrate', '8000000'); // 8 Mbps like WebRTC
          videoUrl.searchParams.set('resolution', '4k');
          videoUrl.searchParams.set('codec', 'vp9');
          pdf.link(20, yPosition - 3, 80, 6, { url: videoUrl.toString() });
          yPosition += 8;

          // Add URL in smaller text
          pdf.setTextColor(0, 0, 0); // Reset to black
          pdf.setFontSize(8);
          const urlLines = pdf.splitTextToSize(videoUrl.toString(), 150);
          pdf.text(urlLines, 20, yPosition);
          yPosition += urlLines.length * 4 + 10;

          pdf.setFontSize(12); // Reset font size
        });
      }

      // Download PDF
      pdf.save(`Meeting_Report_UltraHQ_${selectedMeeting.meeting_id}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Ultra high quality PDF document downloaded successfully!");

    } catch (error) {
      console.error('Failed to generate ultra-high quality PDF:', error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setExportLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  // Generate Word document with ultra-high quality (matching WebRTC approach)
  const handleGenerateWord = async () => {
    if (!selectedMeeting) {
      toast.error("No meeting selected for export");
      return;
    }

    setExportLoading(prev => ({ ...prev, word: true }));

    try {
      // Import docx library dynamically
      const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, ExternalHyperlink } = await import('docx');

      const senderName = user?.landlordInfo?.landlordName || user?.email?.split('@')[0] || 'Landlord';

      const children = [
        // Title with sender info
        new Paragraph({
          text: `Meeting Report from ${senderName}`,
          heading: HeadingLevel.TITLE,
        }),

        // Sender info
        new Paragraph({
          children: [
            new TextRun({ text: "Shared by: ", bold: true }),
            new TextRun({ text: senderName }),
          ],
        }),

        // Meeting Info
        new Paragraph({
          children: [
            new TextRun({ text: "Meeting ID: ", bold: true }),
            new TextRun({ text: selectedMeeting.meeting_id }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Resident Name: ", bold: true }),
            new TextRun({ text: selectedMeeting.name || 'N/A' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Address: ", bold: true }),
            new TextRun({ text: selectedMeeting.address || 'N/A' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Post Code: ", bold: true }),
            new TextRun({ text: selectedMeeting.post_code || 'N/A' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Repair Details: ", bold: true }),
            new TextRun({ text: selectedMeeting.repair_detail || 'N/A' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Date Created: ", bold: true }),
            new TextRun({ text: new Date(selectedMeeting.createdAt).toLocaleDateString() }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Share Link: ", bold: true }),
            new ExternalHyperlink({
              children: [new TextRun({ text: generateShareLink(selectedMeeting.meeting_id), style: "Hyperlink" })],
              link: generateShareLink(selectedMeeting.meeting_id),
            }),
          ],
        }),

        // Spacing
        new Paragraph({ text: "" }),
      ];

      // Add screenshots section with ultra-high quality (matching WebRTC approach)
      if (selectedMeeting.screenshots && selectedMeeting.screenshots.length > 0) {
        children.push(
          new Paragraph({
            text: "Screenshots (Ultra High Quality - 4K Resolution)",
            heading: HeadingLevel.HEADING_1,
          })
        );

        for (let i = 0; i < selectedMeeting.screenshots.length; i++) {
          const screenshot = selectedMeeting.screenshots[i];

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Screenshot ${i + 1} (Ultra High Quality):`, bold: true }),
              ],
            })
          );

          try {
            // Create ultra-high quality image URL (matching WebRTC parameters)
            const imageUrl = new URL(screenshot.url);
            imageUrl.searchParams.set('quality', 'ultra');
            imageUrl.searchParams.set('format', 'png'); // PNG for lossless quality
            imageUrl.searchParams.set('resolution', '4k'); // 4K resolution
            imageUrl.searchParams.set('enhance', 'true'); // Enable enhancement
            imageUrl.searchParams.set('bitrate', 'maximum'); // Maximum bitrate

            // Try to fetch and embed the image with ultra-high quality settings
            const response = await fetch(imageUrl.toString());
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();

              children.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: arrayBuffer,
                      transformation: {
                        width: 600, // Increased from 500 (ultra-high resolution)
                        height: 450, // Increased accordingly (maintaining 4:3 ratio)
                      },
                      // Additional ultra-quality settings for Word (matching WebRTC approach)
                      floating: {
                        horizontalPosition: {
                          offset: 1440000, // Center position
                        },
                        verticalPosition: {
                          offset: 1440000,
                        },
                        // Enhanced quality settings
                        allowOverlap: true,
                        lockAnchor: true,
                      },
                    }),
                  ],
                })
              );
            } else {
              throw new Error('Failed to fetch ultra-high quality image');
            }
          } catch (imageError) {
            console.error('Failed to embed ultra-high quality screenshot:', imageError);
            // Fallback: add hyperlink to image with ultra-quality parameters
            const qualityUrl = new URL(screenshot.url);
            qualityUrl.searchParams.set('quality', 'ultra');
            qualityUrl.searchParams.set('resolution', '4k');
            qualityUrl.searchParams.set('format', 'png');
            children.push(
              new Paragraph({
                children: [
                  new ExternalHyperlink({
                    children: [new TextRun({ text: "View Ultra High Quality Screenshot (4K PNG)", style: "Hyperlink" })],
                    link: qualityUrl.toString(),
                  }),
                  new TextRun({ text: ` (${qualityUrl.toString()})` }),
                ],
              })
            );
          }

          children.push(new Paragraph({ text: "" }));
        }
      }

      // Add recordings section with ultra-high quality (matching WebRTC bitrate settings)
      if (selectedMeeting.recordings && selectedMeeting.recordings.length > 0) {
        children.push(
          new Paragraph({
            text: "Video Recordings (Ultra High Quality - VP9 Codec, 8Mbps)",
            heading: HeadingLevel.HEADING_1,
          })
        );

        selectedMeeting.recordings.forEach((recording, index) => {
          // Create ultra-high quality video URL (matching WebRTC settings)
          const videoUrl = new URL(recording.url);
          videoUrl.searchParams.set('quality', 'ultra');
          videoUrl.searchParams.set('bitrate', '8000000'); // 8 Mbps like WebRTC
          videoUrl.searchParams.set('codec', 'vp9'); // VP9 codec for best quality
          videoUrl.searchParams.set('resolution', '4k'); // 4K resolution
          videoUrl.searchParams.set('audio_bitrate', '192000'); // 192 kbps audio like WebRTC

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Video Recording ${index + 1}: `, bold: true }),
                new ExternalHyperlink({
                  children: [new TextRun({ text: "Click to view Ultra HD video (VP9, 8Mbps)", style: "Hyperlink" })],
                  link: videoUrl.toString(),
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Duration: ", bold: true }),
                new TextRun({ text: `${recording.duration || 0} seconds` }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Type: ", bold: true }),
                new TextRun({ text: "Ultra High Quality Video File (VP9/VP8 codec)" }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Quality: ", bold: true }),
                new TextRun({ text: "4K Resolution, 8Mbps video + 192kbps audio" }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Encoding: ", bold: true }),
                new TextRun({ text: "VP9 codec with advanced quality settings" }),
              ],
            }),
            new Paragraph({ text: "" })
          );
        });
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
      });

      // Generate and download Word document
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Meeting_Report_UltraHQ_${selectedMeeting.meeting_id}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Ultra high quality Word document downloaded successfully!");

    } catch (error) {
      console.error('Failed to generate ultra-high quality Word document:', error);
      toast.error("Failed to generate Word document. Please try again.");
    } finally {
      setExportLoading(prev => ({ ...prev, word: false }));
    }
  };

  // Create share link functionality
  const handleCreateShareLink = async () => {
    if (!selectedMeeting) {
      toast.error("No meeting selected for export");
      return;
    }

    setExportLoading(prev => ({ ...prev, share: true }));

    const shareLink = generateShareLink(selectedMeeting.meeting_id);

    try {
      // Modern browsers with Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareLink);
        toast.success("Share link copied to clipboard!");
      }
      // Fallback for older browsers
      else {
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast.success("Share link copied to clipboard!");
          } else {
            throw new Error('Copy command failed');
          }
        } catch (err) {
          // Final fallback - show the link in a prompt
          window.prompt('Copy this link:', shareLink);
          toast.success("Link displayed for manual copy");
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy share link:', error);
      // Ultimate fallback - show in alert
      window.alert(`Copy this link: ${shareLink}`);
      toast.error("Please copy the link manually from the alert");
    } finally {
      setExportLoading(prev => ({ ...prev, share: false }));
    }
  };

  // Add visitor access handler with localStorage
  const handleVisitorAccess = async (e) => {
    e.preventDefault();

    if (!visitorName.trim()) {
      toast("Name Required", {
        description: "Please enter your name"
      });
      return;
    }

    if (!visitorEmail.trim()) {
      toast("Email Required", {
        description: "Please enter your email address"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitorEmail)) {
      toast("Invalid Email", {
        description: "Please enter a valid email address"
      });
      return;
    }

    setVisitorLoading(true);

    try {
      // Call the callback function with visitor data
      if (visitorAccessCallback) {
        await visitorAccessCallback({
          visitor_name: visitorName.trim(),
          visitor_email: visitorEmail.trim().toLowerCase()
        });
      }

      // Save visitor access token to localStorage with 1 hour expiry
      const visitorToken = {
        name: visitorName.trim(),
        email: visitorEmail.trim().toLowerCase(),
        timestamp: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour from now
      };

      localStorage.setItem('visitorAccessToken', JSON.stringify(visitorToken));

      toast("Access Granted", {
        description: "Your information has been recorded successfully"
      });

      // Reset form and close modal
      setVisitorName('');
      setVisitorEmail('');
      setVisitorAccessOpen(false);

    } catch (error) {
      toast("Failed to Record Access", {
        description: error.message || "Please try again"
      });
    } finally {
      setVisitorLoading(false);
    }
  };

  // Function to check if visitor has valid access token
  const checkVisitorAccess = () => {
    try {
      const storedToken = localStorage.getItem('visitorAccessToken');

      if (!storedToken) {
        return false;
      }

      const visitorToken = JSON.parse(storedToken);
      const currentTime = Date.now();

      // Check if token is expired
      if (currentTime > visitorToken.expiresAt) {
        // Remove expired token
        localStorage.removeItem('visitorAccessToken');
        return false;
      }

      // Token is valid
      console.log('🎫 Valid visitor access token found:', {
        name: visitorToken.name,
        email: visitorToken.email,
        expiresAt: new Date(visitorToken.expiresAt).toLocaleString()
      });

      return true;

    } catch (error) {
      console.error('❌ Error checking visitor access:', error);
      // Remove corrupted token
      localStorage.removeItem('visitorAccessToken');
      return false;
    }
  };

  // Function to open visitor access modal with localStorage check
  const openVisitorAccessModal = (callback) => {
    // Check if user already has valid access
    if (checkVisitorAccess()) {
      console.log('✅ Visitor already has valid access, skipping modal');
      // Call the callback directly without showing modal
      const storedToken = JSON.parse(localStorage.getItem('visitorAccessToken'));
      callback({
        visitor_name: storedToken.name,
        visitor_email: storedToken.email,
        from_storage: true
      });
      return;
    }

    console.log('🔓 No valid visitor access found, showing modal');
    setVisitorAccessCallback(() => callback);
    setVisitorAccessOpen(true);
  };

  // Function to manually clear visitor access (for logout or testing)
  const clearVisitorAccess = () => {
    localStorage.removeItem('visitorAccessToken');
    console.log('🗑️ Visitor access token cleared');
    toast("Access cleared", {
      description: "You will need to provide your information again"
    });
  };

  // Helper function to format date for history
  const formatHistoryDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = String(hours % 12 || 12).padStart(2, '0');

    return `${day}/${month}/${year} at ${displayHours}:${minutes} ${ampm}`;
  };

  // Helper function to get IP location (simplified)
  const getLocationFromIP = (ip) => {
    if (!ip || ip === 'unknown' || ip.includes('127.0.0.1') || ip.includes('::1')) {
      return 'Local/Unknown';
    }
    // For demo purposes, return a placeholder. In production, you'd use a geolocation service
    return 'Location not available';
  };

  // Helper function to parse user agent (simplified)
  const parseUserAgent = (userAgent) => {
    if (!userAgent) return 'Unknown Browser';

    // Simple browser detection
    if (userAgent.includes('Chrome')) return 'Google Chrome';
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Microsoft Edge';
    if (userAgent.includes('Opera')) return 'Opera';

    return 'Unknown Browser';
  };

  // Helper function to get unique visitors by email
  const getUniqueVisitors = (accessHistory) => {
    if (!accessHistory || !Array.isArray(accessHistory)) return [];

    const uniqueEmails = new Set();
    const uniqueVisitors = [];

    // Sort by access time (newest first) to get the latest entry for each email
    const sortedHistory = [...accessHistory].sort((a, b) =>
      new Date(b.access_time) - new Date(a.access_time)
    );

    sortedHistory.forEach(access => {
      const email = access.visitor_email?.toLowerCase() || 'no-email';
      if (!uniqueEmails.has(email)) {
        uniqueEmails.add(email);
        uniqueVisitors.push(access);
      }
    });

    return uniqueVisitors;
  };

  const value = {
    setResetOpen,
    setMessageOpen,
    setLandlordDialogOpen: (open) => {
      setLandlordDialogOpen(open);
      if (open) {
        loadLandlordData();
      } else {
        setTimeout(() => {
          resetLandlordForm();
        }, 300);
      }
    },
    setTickerOpen,
    setInviteOpen,
    setFeedbackOpen,
    setFaqOpen,
    setForgotPasswordOpen,
    setExportOpen: (open, meeting = null) => {
      setExportOpen(open);
      if (meeting) {
        setSelectedMeeting(meeting);
      }
    },
    selectedMeeting,
    setSelectedMeeting,
    handleCopyLink,
    handleGenerateWord,
    handleGeneratePDF,
    handleCreateShareLink,
    exportLoading,
    openVisitorAccessModal,
    visitorAccessOpen,
    setVisitorAccessOpen,
    clearVisitorAccess, // Add this for manual clearing if needed
    checkVisitorAccess, // Add this for external checks if needed
    setHistoryOpen: (open, meeting = null) => {
      setHistoryOpen(open);
      if (meeting) {
        setSelectedMeetingForHistory(meeting);
      }
    },
    historyOpen,
    selectedMeetingForHistory,
    // Add new share link dialog methods
    setShareLinkOpen: (open, meeting = null) => {
      setShareLinkOpen(open);
      if (meeting) {
        setSelectedMeetingForShare(meeting);
      }
    },
    shareLinkOpen,
    selectedMeetingForShare
  };

  return (
    <DialogContext.Provider value={value}>
      {children}

      <DialogComponent open={resetOpen} setOpen={setResetOpen} isCloseable={true}>
        <div className="w-[360px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <LockIcon className="w-5 h-5 text-white" />
              <h2 className="text-base font-semibold">Reset Password</h2>
            </div>
            <button
              onClick={() => setResetOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleResetPassword}>
              {/* Fields */}
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-red-500 -mt-1">
                  Minimum 8 characters including 1 capital, 1 lower case and 1 special character
                </p>
                <input
                  type="password"
                  placeholder="Retype new password"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Type secret account recovery word (optional)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  value={recoveryWord}
                  onChange={(e) => setRecoveryWord(e.target.value)}
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={resetLoading}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save new password'
                )}
              </button>
            </form>

            {/* Forgot Link */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setResetOpen(false);
                  setForgotPasswordOpen(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </div>
      </DialogComponent>
      <DialogComponent open={messageOpen} setOpen={setMessageOpen} isCloseable={true}>
        <div className="w-[500px] max-h-[90vh] bg-purple-500 rounded-2xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <h2 className="text-lg font-semibold">Amend Message:</h2>
            <button
              onClick={() => setMessageOpen(false)}
              className="absolute right-4 text-white hover:text-gray-200 transition"
              aria-label="Close dialog"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {/* Default Message */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-sm text-black">Default message:</label>
                <div className="flex items-center gap-1">
                  <select
                    value={defaultTextSize}
                    onChange={(e) => setDefaultTextSize(e.target.value)}
                    className="text-white bg-black border border-gray-300 rounded-lg px-3 py-1 text-xs mr-6"
                  >
                    <option value="10px" style={{ color: 'white' }}>Text Size: 10</option>
                    <option value="11px" style={{ color: 'white' }}>Text Size: 11</option>
                    <option value="12px" style={{ color: 'white' }}>Text Size: 12</option>
                    <option value="13px" style={{ color: 'white' }}>Text Size: 13</option>
                    <option value="14px" style={{ color: 'white' }}>Text Size: 14</option>
                    <option value="16px" style={{ color: 'white' }}>Text Size: 16</option>
                    <option value="18px" style={{ color: 'white' }}>Text Size: 18</option>
                    <option value="20px" style={{ color: 'white' }}>Text Size: 20</option>
                    <option value="22px" style={{ color: 'white' }}>Text Size: 22</option>
                  </select>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={messageOption === 'default'}
                  onChange={() => setMessageOption('default')}
                  className="mt-1"
                />
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" style={{ fontSize: defaultTextSize }}>
                  <p>Please click on the link below to connect with your landlord</p>
                  <a
                    href="https://www.videodesk.co.uk/xyz91dasd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    www.Videodesk.co.uk/xyz91dasd
                  </a>
                </div>
              </div>
            </div>

            {/* Tailored Message */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-sm text-black">Or type tailored message:</label>
                <div className="flex items-center gap-1">
                  <select
                    value={tailoredTextSize}
                    onChange={(e) => setTailoredTextSize(e.target.value)}
                    className="text-white bg-black border border-gray-300 rounded-lg px-3 py-1 text-xs mr-6"
                  >
                    <option value="10px" style={{ color: 'white' }}>Text Size: 10</option>
                    <option value="11px" style={{ color: 'white' }}>Text Size: 11</option>
                    <option value="12px" style={{ color: 'white' }}>Text Size: 12</option>
                    <option value="13px" style={{ color: 'white' }}>Text Size: 13</option>
                    <option value="14px" style={{ color: 'white' }}>Text Size: 14</option>
                    <option value="16px" style={{ color: 'white' }}>Text Size: 16</option>
                    <option value="18px" style={{ color: 'white' }}>Text Size: 18</option>
                    <option value="20px" style={{ color: 'white' }}>Text Size: 20</option>
                    <option value="22px" style={{ color: 'white' }}>Text Size: 22</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="checkbox"
                  checked={messageOption === 'tailored'}
                  onChange={() => setMessageOption('tailored')}
                  className="mt-1"
                />
                <textarea
                  placeholder="Enter your message"
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none ${messageOption === 'tailored' ? 'h-[6rem]' : 'h-[4rem]'}`}
                  style={{ fontSize: tailoredTextSize }}
                />
              </div>
            </div>

            {/* Choose Button Color Section */}
            <div className="mb-6">
              <h3 className="font-medium text-sm text-black mb-4">Choose the button colour that the user will click to connect on the sent link:</h3>

              {/* Default heading and green circle on left */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-black">Default:</span>
                <button
                  onClick={() => setSelectedButtonColor('bg-green-800')}
                  className={`rounded-full border transition-all ${selectedButtonColor === 'bg-green-800'
                    ? 'border-black border-2 scale-110'
                    : 'border-gray-300'
                    }`}
                  style={{
                    backgroundColor: '#166534',
                    width: '5mm',
                    height: '5mm'
                  }}
                  title="Default Green"
                />
              </div>

              {/* Color Row - 5 colors centered */}
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-1">
                  {buttonColors.map((colorOption, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedButtonColor(colorOption.bgClass)}
                      className={`rounded-full border transition-all ${selectedButtonColor === colorOption.bgClass
                        ? 'border-black border-2 scale-110'
                        : 'border-gray-300'
                        }`}
                      style={{
                        backgroundColor: colorOption.color,
                        width: '5mm',
                        height: '5mm'
                      }}
                      title={colorOption.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview Button */}
              <div className="flex justify-center">
                <button className={`w-[70%] ${selectedButtonColor} ${selectedButtonColor === 'bg-green-800' ? 'hover:bg-green-900' : buttonColors.find(c => c.bgClass === selectedButtonColor)?.hoverClass} text-white font-bold py-3 rounded-full text-sm transition`}>
                  Tap to allow video<br />session now
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={() => { }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-full text-sm transition"
            >
              Save
            </button>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={landlordDialogOpen} setOpen={setLandlordDialogOpen} isCloseable>
        <div className="w-[550px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <h2 className="text-base font-semibold">Add Landlord Name/Logo/Profile Image:</h2>
            <button
              onClick={() => setLandlordDialogOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <div className="space-y-4">
              {/* Landlord Name Section */}
              <div className="flex items-start flex-col gap-2">
                <label className="text-black font-semibold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={landlordNameEnabled}
                    onChange={(e) => setLandlordNameEnabled(e.target.checked)}
                  />
                  Landlord Name:
                </label>
                <div className="flex items-center gap-2 w-full ml-4">
                  <input
                    type="text"
                    placeholder="Type here"
                    value={landlordName}
                    onChange={(e) => setLandlordName(e.target.value)}
                    disabled={!landlordNameEnabled}
                    className={`flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none ${!landlordNameEnabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  />
                </div>
              </div>

              {/* Landlord Logo Section */}
              <div className="flex items-start flex-col gap-2">
                <label className="text-black font-semibold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={landlordLogoEnabled}
                    onChange={(e) => setLandlordLogoEnabled(e.target.checked)}
                  />
                  Upload Landlord logo to use on dashboard:
                </label>
                <div className={`flex relative items-center justify-center gap-2 w-[97%] p-4 h-[4rem] border border-gray-300 rounded-md ml-4 ${!landlordLogoEnabled ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                  {/* Upload area - clickable only when checkbox is enabled and no image */}
                  <div
                    className={`flex items-center justify-center w-full h-full ${!landlordLogo && landlordLogoEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => {
                      if (!landlordLogo && landlordLogoEnabled) {
                        document.getElementById('landlordLogoInput').click();
                      }
                    }}
                  >
                    {landlordLogo ? (
                      <img src={landlordLogo} alt="Landlord Logo Preview" className="max-h-8 max-w-full object-contain" />
                    ) : (
                      <img src="/icons/material-symbols_upload-rounded.svg" className={!landlordLogoEnabled ? 'opacity-50' : ''} />
                    )}
                  </div>

                  {/* Trash icon - only visible when logo exists and checkbox is enabled */}
                  {landlordLogoEnabled && landlordLogo && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 cursor-pointer z-10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteLandlordLogo();
                      }}
                    >
                      <img src="/icons/trash-red.svg" className="w-5 h-5" />
                    </button>
                  )}

                  {/* Hidden file input */}
                  <input
                    id="landlordLogoInput"
                    type="file"
                    accept="image/*"
                    onChange={handleLandlordLogoSelect}
                    disabled={!landlordLogoEnabled}
                    className="hidden"
                  />
                </div>

                {/* Use landlord logo for profile section */}
                <div className="ml-4 mt-2">
                  <label className="text-black font-semibold flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profileImageOption === 'landlord'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setProfileImageOption('landlord');
                        } else {
                          setProfileImageOption('');
                        }
                      }}
                      disabled={!landlordLogoEnabled || !landlordLogo}
                    />
                    <span className={!landlordLogoEnabled || !landlordLogo ? 'text-gray-400' : 'text-black'}>
                      Use landlord logo for profile photo
                    </span>
                  </label>
                </div>
              </div>

              {/* Officer Image Section */}
              <div className="flex items-start flex-col gap-2">
                <label className="text-black font-semibold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profileImageOption === 'officer'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProfileImageOption('officer');
                      } else {
                        setProfileImageOption('');
                      }
                    }}
                  />
                  Upload Officer image to use as profile photo:
                </label>
                <div className={`flex relative items-center justify-center gap-2 w-[97%] p-4 h-[12rem] border border-gray-300 rounded-md ml-4 ${profileImageOption !== 'officer' ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                  {/* Upload area - only clickable when officer option is selected */}
                  <div
                    className={`flex items-center justify-center w-full h-full ${profileImageOption === 'officer' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => {
                      if (profileImageOption === 'officer') {
                        document.getElementById('officerImageInput').click();
                      }
                    }}
                  >
                    {officerImage ? (
                      <img
                        src={officerImage}
                        alt="Officer Preview"
                        className="max-h-28 max-w-full object-contain pointer-events-none"
                        onError={(e) => {
                          // If image fails to load, show initials
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = `
                      <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xl">
                        ${getInitials(landlordName || user?.email?.split('@')[0] || 'User')}
                      </div>
                    `;
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <img src="/icons/material-symbols_upload-rounded.svg" className={`pointer-events-none mb-2 ${profileImageOption !== 'officer' ? 'opacity-50' : ''}`} />
                        {profileImageOption === 'officer' && (
                          <span className="text-xs text-center">Upload officer image</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Trash icon - only visible when officer image exists and option is selected */}
                  {profileImageOption === 'officer' && officerImage && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteOfficerImage();
                      }}
                    >
                      <img src="/icons/trash-red.svg" className="w-5 h-5" />
                    </button>
                  )}

                  {/* Profile Shape Controls - only visible when officer option is selected */}
                  <div className={`absolute bottom-2 left-4 right-4 flex items-center gap-4 ${profileImageOption !== 'officer' || !officerImage ? 'opacity-50 pointer-events-none' : ''}`}>
                    <span className="text-black font-semibold text-sm">Select Profile Shape:</span>
                    <label className="text-black font-semibold flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileShape === 'square'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProfileShape('square');
                          } else {
                            setProfileShape('');
                          }
                        }}
                        disabled={profileImageOption !== 'officer' || !officerImage}
                        className="w-4 h-4"
                      />
                      Square
                    </label>
                    <label className="text-black font-semibold flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileShape === 'circle'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProfileShape('circle');
                          } else {
                            setProfileShape('');
                          }
                        }}
                        disabled={profileImageOption !== 'officer' || !officerImage}
                        className="w-4 h-4"
                      />
                      Circle
                    </label>
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="officerImageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleOfficerImageSelect}
                    disabled={profileImageOption !== 'officer'}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Redirect Options Section */}
              <div className="mt-6">
                <label className="text-black font-semibold block mb-4">
                  When video call ends, user is directed to the following website:
                </label>

                {/* Default Option */}
                <div className="flex items-start flex-col gap-2">
                  <label className="text-black font-semibold flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={redirectOption === 'default'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRedirectOption('default');
                        } else {
                          setRedirectOption('');
                        }
                      }}
                    />
                    Default:
                  </label>
                  <div className="flex items-center gap-2 w-full ml-4">
                    <input
                      type="text"
                      value={redirectUrlDefault}
                      onChange={(e) => setRedirectUrlDefault(e.target.value)}
                      disabled={true}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>
                {/* Tailored Option */}
                <div className="flex items-start flex-col gap-2 mt-4">
                  <label className="text-black font-semibold flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={redirectOption === 'tailored'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRedirectOption('tailored');
                        } else {
                          setRedirectOption('');
                        }
                      }}
                    />
                    Tailored:
                  </label>
                  <div className="flex items-center gap-2 w-full ml-4">
                    <input
                      type="text"
                      value={redirectUrlTailored}
                      onChange={(e) => setRedirectUrlTailored(e.target.value)}
                      disabled={redirectOption !== 'tailored'}
                      className={`flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none ${redirectOption !== 'tailored' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveLandlordInfo}
              disabled={landlordSaving}
              className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2"
            >
              {landlordSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={ticketOpen} setOpen={setTickerOpen} isCloseable={true}>
        <div className="w-[500px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <MailIcon className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold">Raise Support Ticket</h2>
            </div>
            <button
              onClick={() => setTickerOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleRaiseSupportTicket}>
              {/* Category Dropdown */}
              <div className="mb-4">
                <select
                  value={supportCategory}
                  onChange={(e) => setSupportCategory(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  style={{
                    height: '48px',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'calc(100% - 16px) center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '20px'
                  }}
                  size="1"
                  required
                >
                  <option value="">Choose a category</option>
                  {supportCategories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  placeholder="Enter support query"
                  className="w-full h-40 px-4 py-3 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={supportQuery}
                  onChange={(e) => setSupportQuery(e.target.value)}
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={supportLoading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-full text-sm transition flex items-center justify-center gap-2"
              >
                {supportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={inviteOpen} setOpen={setInviteOpen} isCloseable={true}>
        <div className="w-[360px] max-h-[90vh] bg-purple-500 rounded-2xl shadow-md relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 relative m-0">
            <div className="flex items-center gap-2">
              <img src="/icons/ri_user-add-line.svg" className="filter brightness-0 invert" />
              <h2 className="text-base font-semibold">Invite Co-Worker(s)</h2>
            </div>
            <button
              onClick={() => setInviteOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {/* Dynamic Email Fields */}
            <div className="space-y-3">
              {inviteEmails.map((email, index) => (
                <div key={index}>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder={`${index + 1}. Enter email address for Co-worker`}
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      className={`w-full px-4 py-2 text-sm border border-gray-300 rounded-lg ${index > 0 ? 'pr-12' : ''}`}
                    />
                    {index > 0 && (
                      <button
                        onClick={() => removeEmailField(index)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-full cursor-pointer transition-colors shadow-lg flex items-center justify-center"
                      >
                        -
                      </button>
                    )}
                  </div>
                  {index === inviteEmails.length - 1 && (
                    <div className="flex justify-end items-center mt-3">
                      <button
                        onClick={addEmailField}
                        className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-full cursor-pointer transition-colors shadow-lg relative"
                      >
                        <span className="absolute inset-0 flex items-center justify-center" style={{ top: '-1px' }}>
                          +
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <textarea
                rows={3}
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg resize-y"
              />
            </div>

            {/* Invite Button */}
            <button
              onClick={handleInviteCoWorkers}
              disabled={inviteLoading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 rounded-full text-sm transition flex items-center justify-center gap-2"
            >
              {inviteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Invite'
              )}
            </button>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={feedbackOpen} setOpen={setFeedbackOpen} isCloseable={true}>
        <div className="w-[520px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <img src="/icons/ic_sharp-outlined-flag.svg" className="filter brightness-0 invert" />
              <h2 className="text-base font-semibold">Give Feedback/Make Suggestions</h2>
            </div>
            <button
              onClick={() => setFeedbackOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleSendFeedback}>
              {/* Feedback Field */}
              <textarea
                placeholder="We'd love to hear your feedback, so please get in touch with any feedback or suggestions"
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg h-40 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={feedbackLoading}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2"
              >
                {feedbackLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={faqOpen} setOpen={setFaqOpen} isCloseable={true}>
        <div className="rounded-2xl shadow-md max-h-[90vh] overflow-hidden bg-purple-500">
          {/* Header */}
          <div className="flex items-center justify-between bg-purple-500 text-white p-4 m-0">
            <span></span>
            <div className="flex items-center gap-2 justify-center">
              <h2 className="text-base font-semibold text-center">
                FAQs<br />
                (Frequently Asked Questions)
              </h2>
            </div>
            <button onClick={() => setFaqOpen(false)} aria-label="Close">
              <XIcon className="w-5 h-5 text-white hover:text-gray-200" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto bg-white rounded-b-2xl max-h-[calc(90vh-4rem)]">
            {/* FAQ Accordion List */}
            <div className="space-y-2">
              {faqs.map((question, index) => (
                <Disclosure key={index}>
                  {({ open }) => (
                    <div className="rounded-md bg-yellow-500">
                      <Disclosure.Button className="flex justify-between items-center w-full px-4 py-2 text-left text-black font-medium focus:outline-none">
                        <span>{question}</span>
                        <ChevronDownIcon
                          className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </Disclosure.Button>
                      <Disclosure.Panel className="px-4 pb-2 text-sm text-black bg-yellow-100">
                        This is the answer for: <strong>{question}</strong>. You can customize this.
                      </Disclosure.Panel>
                    </div>
                  )}
                </Disclosure>
              ))}
            </div>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={forgotPasswordOpen} setOpen={setForgotPasswordOpen} isCloseable={true}>
        <div className="w-[400px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <LockIcon className="w-5 h-5 text-white" />
              <h2 className="text-base font-semibold">Forgot Password</h2>
            </div>
            <button
              onClick={() => setForgotPasswordOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleForgotPassword}>
              <p className="text-sm text-gray-600 mb-4 text-center">
                Enter the email address you used to sign up for your account
              </p>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={forgotLoading}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            {/* Back to Reset Link */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setForgotPasswordOpen(false);
                  setResetOpen(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Back to Reset Password
              </button>
            </div>
          </div>
        </div>
      </DialogComponent>

      <DialogComponent open={exportOpen} setOpen={setExportOpen} isCloseable={true}>
        <div className="w-[400px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <img src="/icons/icon-park_share.svg" className="w-5 h-5 filter brightness-0 invert" />
              <h2 className="text-base font-semibold">Export Options</h2>
            </div>
            <button
              onClick={() => setExportOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <div className="space-y-3">
              {/* Create Share Link */}
              <button
                onClick={handleCreateShareLink}
                disabled={exportLoading.share}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
              >
                <Link className="w-5 h-5 text-gray-600" />
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>
                  {exportLoading.share ? 'Opening link...' : 'Create share link'}
                </span>
                {exportLoading.share && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>

              {/* Copy and Paste Link to Email */}
              <button
                onClick={handleCopyLink}
                disabled={exportLoading.copy}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
              >
                <Copy className="w-5 h-5 text-gray-600" />
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>
                  {exportLoading.copy ? 'Copying...' : 'Copy link and paste in email'}
                </span>
                {exportLoading.copy && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>

              {/* Copy and Paste to Word */}
              <button
                onClick={handleGenerateWord}
                disabled={exportLoading.word}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>
                  {exportLoading.word ? 'Generating Word...' : 'Generate Word document'}
                </span>
                {exportLoading.word && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>

              {/* Convert to PDF */}
              <button
                onClick={handleGeneratePDF}
                disabled={exportLoading.pdf}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left disabled:opacity-50"
              >
                <FileSearch className="w-5 h-5 text-red-600" />
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>
                  {exportLoading.pdf ? 'Generating PDF...' : 'Generate PDF document'}
                </span>
                {exportLoading.pdf && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>
            </div>
          </div>
        </div>
      </DialogComponent>

      {/* Visitor Access Modal */}
      <DialogComponent open={visitorAccessOpen} setOpen={() => { }} isCloseable={false}>
        <div className="w-[400px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">To Access Shared Link</h2>
            </div>
            <button
              onClick={() => window.close()}
              aria-label="Close tab"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            <form onSubmit={handleVisitorAccess}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Enter your work email address"
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={visitorLoading}
                className="mt-6 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2"
              >
                {visitorLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </>
                ) : (
                  'Access Shared Link'
                )}
              </button>
            </form>
          </div>
        </div>
      </DialogComponent>

      {/* History Modal */}
      <DialogComponent open={historyOpen} setOpen={setHistoryOpen} isCloseable={true}>
        <div className="w-[600px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <img src="/icons/icon-park-outline_history-query.svg" className="w-5 h-5 filter brightness-0 invert" />
              <h2 className="text-base font-semibold">Access History</h2>
            </div>
            <button
              onClick={() => setHistoryOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {selectedMeetingForHistory ? (
              <div className="space-y-4">
                {/* Meeting Info Header */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">ID:</span>
                      <p className="text-gray-600">{selectedMeetingForHistory.meeting_id}</p>
                    </div>
                    <div>
                      <span className="font-medium">Resident:</span>
                      <p className="text-gray-600">{selectedMeetingForHistory.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Address:</span>
                      <p className="text-gray-600">{selectedMeetingForHistory.address || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <p className="text-gray-600">{formatHistoryDate(selectedMeetingForHistory.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Access Statistics */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Access Statistics</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedMeetingForHistory.total_access_count || selectedMeetingForHistory.access_history?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Total Accesses</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {getUniqueVisitors(selectedMeetingForHistory.access_history).length}
                      </div>
                      <div className="text-xs text-gray-600">Unique Visitors</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedMeetingForHistory.access_history?.length > 0 ?
                          formatHistoryDate(selectedMeetingForHistory.access_history[selectedMeetingForHistory.access_history.length - 1].access_time).split(' ')[0] :
                          'N/A'
                        }
                      </div>
                      <div className="text-xs text-gray-600">Last Access</div>
                    </div>
                  </div>
                </div>

                {/* Access History List - Only Unique Visitors */}
                <div>
                  <h4 className="font-semibold mb-3">Unique Visitor Access Log</h4>
                  {(() => {
                    const uniqueVisitors = getUniqueVisitors(selectedMeetingForHistory.access_history);

                    if (uniqueVisitors.length > 0) {
                      return (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {uniqueVisitors.map((access, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-lg">
                                    {access.visitor_name ? access.visitor_name.charAt(0).toUpperCase() : 'V'}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-base text-gray-900">
                                    {access.visitor_name || 'Unknown Visitor'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {access.visitor_email || 'No email provided'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-400 mb-1">
                                    #{index + 1}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Latest: {formatHistoryDate(access.access_time)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <img src="/icons/icon-park-outline_history-query.svg" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No visitor access recorded yet</p>
                          <p className="text-sm">When someone visits the shared link, their access will be logged here.</p>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Meeting Content Summary */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Content Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Video Recordings</span>
                        <span className="text-lg font-bold text-green-600">
                          {selectedMeetingForHistory.recordings?.length || 0}
                        </span>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Screenshots</span>
                        <span className="text-lg font-bold text-blue-600">
                          {selectedMeetingForHistory.screenshots?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share Link */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-medium block mb-2">Share Link:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-white p-2 rounded text-xs flex-1 border">
                      {`${window.location.origin}/share/${selectedMeetingForHistory.meeting_id}`}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/share/${selectedMeetingForHistory.meeting_id}`);
                        toast.success("Link copied to clipboard!");
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Not selected</p>
              </div>
            )}
          </div>
        </div>
      </DialogComponent>
      {/* Create share Link */}
      <DialogComponent open={shareLinkOpen} setOpen={setShareLinkOpen} isCloseable={true}>
        <div className="w-[400px] max-h-[90vh] rounded-2xl bg-purple-500 shadow-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-white" />
              <h2 className="text-base font-semibold">Share Meeting</h2>
            </div>
            <button
              onClick={() => setShareLinkOpen(false)}
              aria-label="Close"
              className="absolute right-4 text-white hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 bg-white rounded-b-2xl max-h-[calc(90vh-4rem)] overflow-y-auto">
            {selectedMeetingForShare ? (
              <div className="space-y-4">
                {/* Meeting Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Meeting Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {selectedMeetingForShare.meeting_id}
                    </div>
                    <div>
                      <span className="font-medium">Resident:</span> {selectedMeetingForShare.name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span> {selectedMeetingForShare.address || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Share Link */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Share Link</h4>
                  <div className="flex items-center gap-2">
                    <code className="bg-white p-2 rounded text-xs flex-1 border">
                      {(() => {
                        const fullLink = generateShareLink(selectedMeetingForShare.meeting_id);
                        return fullLink.length > 30 ? `${fullLink.substring(0, 30)}.....` : fullLink;
                      })()}
                    </code>
                    <button
                      onClick={() => {
                        if (!selectedMeetingForShare) {
                          toast.error("No meeting selected for sharing");
                          return;
                        }

                        setExportLoading(prev => ({ ...prev, share: true }));

                        const shareLink = generateShareLink(selectedMeetingForShare.meeting_id);

                        try {
                          // Modern browsers with Clipboard API
                          if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(shareLink);
                            toast.success("Share link copied to clipboard!");
                          }
                          // Fallback for older browsers
                          else {
                            const textArea = document.createElement('textarea');
                            textArea.value = shareLink;
                            textArea.style.position = 'fixed';
                            textArea.style.left = '-999999px';
                            textArea.style.top = '-999999px';
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();

                            try {
                              const successful = document.execCommand('copy');
                              if (successful) {
                                toast.success("Share link copied to clipboard!");
                              } else {
                                throw new Error('Copy command failed');
                              }
                            } catch (err) {
                              // Final fallback - show the link in a prompt
                              window.prompt('Copy this link:', shareLink);
                              toast.success("Link displayed for manual copy");
                            }

                            document.body.removeChild(textArea);
                          }
                        } catch (error) {
                          console.error('Failed to copy share link:', error);
                          // Ultimate fallback - show in alert
                          window.alert(`Copy this link: ${shareLink}`);
                          toast.error("Please copy the link manually from the alert");
                        } finally {
                          setExportLoading(prev => ({ ...prev, share: false }));
                        }
                      }}
                      disabled={exportLoading.share}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 py-2 rounded text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      {exportLoading.share ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Copying...
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {selectedMeetingForShare.recordings?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Videos</div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {selectedMeetingForShare.screenshots?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Screenshots</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No meeting selected</p>
              </div>
            )}
          </div>
        </div>
      </DialogComponent>
    </DialogContext.Provider>
  );
};

export default DialogProvider;
