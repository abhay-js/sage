export const privacyPolicyUpdated = '12 October 2026';

// Update this notice when integrations or data flows change.
export const privacySections = [
  { title: 'About Sage', paragraphs: [
    'Sage is an endurance training and fitness challenge app operated by Abhay Jain. This policy explains how Sage handles information when you use its mobile app and website.',
  ] },
  { title: 'Information you provide', paragraphs: [
    'We store account information such as your name, email address, account status and authentication records. Your password is handled by our authentication provider, Supabase.',
    'Your profile may include a photo or photo URL, gender, date of birth, city, country, sports, training history and goals. We also store challenge entries, group-session participation, scores, referrals and membership status. If you submit payment evidence, it can include transaction details visible in your screenshot. Avoid including unrelated financial information.',
  ] },
  { title: 'Workout and health information', paragraphs: [
    'When you choose to import or submit a workout, Sage can receive its source identifier, activity type, title, start time, duration, distance, pace or speed, elevation, calories, heart-rate information and indoor/outdoor status, depending on what the source provides.',
    'On supported native builds, Apple Health or Health Connect access requires your device permissions. Sage reads permitted workout information and stores imported workout summaries in your Sage account. Once you enable the health connection, imports run when you open Sage or return it to the foreground. You can stop these automatic imports in Workout connections. Connection preferences and the last successful import time are stored on your device separately for each Sage account. Detailed Apple Health heart-rate and route samples used for charts are read on the iPhone holding those records; those chart samples are not uploaded by the chart viewer.',
    'A .FIT upload stores the original workout file and available detailed samples, including heart rate and GPS, on our backend. A submitted Strava link stores the link and your note for review; opening a link alone does not authorize automatic access to your Strava account. Where Strava connection is available and you authorize it, Sage stores connection credentials and imports permitted activity information. Direct Garmin Connect sync is not currently available in Sage.',
  ] },
  { title: 'Location and recorded workouts', paragraphs: [
    'If you start a Sage GPS workout, the app collects precise location coordinates, timestamps, accuracy and available altitude to calculate your route, distance and pace. With background-location permission, recording can continue while the app is in the background during that workout. Recording stops when you pause or finish, discard the recording, or sign out.',
    'An unfinished or unsent recording is saved on your device so you can recover it. Choosing Save & Submit uploads the recording and its route to your Sage account for admin review. GPS locations can reveal sensitive places such as your home or workplace; consider this before submitting a route.',
  ] },
  { title: 'How information is used', paragraphs: [
    'We use information to authenticate your account, display workout summaries and charts, review activity evidence, assign training levels, calculate challenge scores and rankings, manage sessions and membership, and investigate errors or misuse.',
    'Sage does not sell your personal information or use your health data for advertising. The current app does not include advertising or third-party marketing trackers. Fitness information is used for Sage’s training and challenge features, not medical diagnosis or treatment.',
  ] },
  { title: 'Who can see information', paragraphs: [
    'Authorized Sage administrators can review athlete profiles, workout summaries and submitted evidence, including uploaded heart-rate samples and GPS routes where available. They can approve or reject workouts and assign training levels. This admin review is part of Sage’s challenge service.',
    'Other participants can see information shown in community features, such as your display name, profile image, challenge rank, score and training totals, or group-session participation. Detailed uploaded workout files and routes are restricted to the account owner and authorized administrators.',
    'Profile-image links and payment-screenshot links may be publicly accessible to anyone who has the URL. Do not upload sensitive documents or share these URLs unnecessarily. If you open an external Strava or map link, the external service receives that request under its own privacy policy.',
  ] },
  { title: 'Service providers and storage', paragraphs: [
    'Sage uses Supabase for authentication, database storage, file storage and backend processing, and Vercel to host the website. These providers process information needed to operate the service. Hosting providers may process technical logs such as IP addresses, request times, browser or device information and errors. Data may be processed outside your country.',
    'Apple, Google, Strava and map services handle information under their own policies when you use their services. Sage uses HTTPS connections and account-based access controls for protected workout data. No online service can guarantee complete security.',
  ] },
  { title: 'Your choices and permissions', paragraphs: [
    'You can edit supported profile fields in Sage, choose whether to upload a file or submit a recording, and discard an unsent GPS workout. You can revoke Health, Health Connect, photo or location permissions through your device settings, and revoke a Strava connection through Strava’s connected-app settings.',
    'Revoking a permission stops future permitted access; it does not automatically delete workouts or files already stored in Sage. Signing out also does not delete your account. The website stores an authentication session in browser storage so you can remain signed in; signing out clears the active Sage session.',
  ] },
  { title: 'Retention and deletion requests', paragraphs: [
    'Account records, imported workouts, submitted files and review history are retained while they are needed to provide Sage’s features. Sage does not currently offer an automatic in-app account-deletion button.',
    'For access, correction or deletion of your account, workouts, uploaded files or route data, contact the Sage administrator who provided your app or challenge access and identify the email address used for your account. Do not send your password. We may ask you to verify account ownership before handling a request. Some records may need to be retained for security, payment disputes or legal obligations, and provider backups may not be removed immediately.',
  ] },
  { title: 'Children and policy updates', paragraphs: [
    'Sage is not designed for children. If you believe a child has supplied personal information, contact the Sage administrator to request review and removal.',
    'We will update this page when our data practices change and revise the date above. New integrations may require additional authorization before they access your information.',
  ] },
  { title: 'Contact', paragraphs: [
    'For privacy questions or data requests, contact Abhay Jain, the Sage administrator, through the contact channel used to provide your Sage account or challenge access. Include your account email and the request you want us to review.',
  ] },
];
