import {  INewUser, IUpdatePost, IUpdateUser } from "@/types";
import { ID } from "appwrite";
import { account, appwriteConfig, avatars, database, storage } from "./config";
import { Query } from "appwrite";

export async function createUserAccount(user: INewUser) {
    try {
      const newAccount = await account.create(
        ID.unique(),
        user.email,
        user.password,
        user.name
      );
  
      if (!newAccount) throw new Error("Failed to create Appwrite account");
  
      const avatarUrl = avatars.getInitials(user.name);
  
      const newUser = await saveUserToDB({
        accountId: newAccount.$id,
        name: newAccount.name,
        email: newAccount.email,
        username: user.username,
        imageUrl: avatarUrl,
      });
  
      return newUser;
    } catch (error: any) {
      console.error("Error in createUserAccount:", error); 
      throw new Error("Error creating user account");
    }
}; 
  
export async function saveUserToDB(user: {
    accountId: string;
    name: string;
    email: string;
    imageUrl: string;
    username?: string;
}) {
    try{
        const newUser = await database.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            user,
        )
        return newUser;
    }catch(error){
        console.log(error);
    }
};

export async function signInAccount(user: { email: string, password: string }) {
  try {
    console.log('Signing in user:', user);
    // Attempt to get the active session
    try {
      const activeSession = await account.get();
      console.log('Active session found:', activeSession);

      // Delete the current session if necessary
      await account.deleteSession('current');
      console.log('Active session deleted.');
    } catch (sessionError) {
      console.log('No active session found. Proceeding to sign in...');
    }

    // Create a new session
    const session = await account.createEmailPasswordSession(user.email, user.password);
    console.log('Session created:', session);
    return session;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export async function getCurrentUser() {
  try {
    const currentAccount = await account.get();
    console.log('Current account details:', currentAccount);

    const currentUser = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('accountId', currentAccount.$id)]
    );

    if (!currentUser || currentUser.total === 0) {
      throw new Error('User not found in database');
    }

    console.log('Current user document:', currentUser.documents[0]);
    return currentUser.documents[0];
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};


export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    console.log(error);
  }
}

export type INewPost = {
  userId: string;
  caption: string;
  file: File[];
  location?: string;
  tags?: string;
};

export async function createPost(post: INewPost) {
  try {
    // Upload file to appwrite storage
    const uploadedFile = await uploadFile(post.file[0]);

    if (!uploadedFile) throw Error;

    // Get file url
    const fileUrl = await getFilePreview(uploadedFile.$id);
    if (!fileUrl) {
      await deleteFile(uploadedFile.$id);
      throw new Error("Failed to retrieve file URL.");
    }
    
    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];
    
    // Create post
    const newPost = await database.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creators: post.userId,
        caption: post.caption,
        imageUrl: fileUrl.toString(),
        imageId: uploadedFile.$id,
        location: post.location,
        tags: tags,
      }
    );
    
    if (!newPost) {
      await deleteFile(uploadedFile.$id);
      throw new Error("Failed to create post.");
    }
    
    return newPost;
  } catch (error) {
    console.error("Error creating post:", error);
    throw new Error("Failed to create post.");
  }
}

export async function uploadFile(file: File) {
  try {
    return await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return null;
  }
}

export function getFilePreview(fileId: string) {
  try {
    const fileUrl = storage.getFileDownload(
      appwriteConfig.storageId,
      fileId
    );
    return fileUrl.toString();
  } catch (error) {
    console.error("Error fetching file preview:", error);
    return null;
  }
}

export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);
    return { status: "ok" };
  } catch (error) {
    console.error("Error deleting file:", error);
    return null;
  }
}

export async function searchPosts(searchTerm: string) {
  try {
    return await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.search("caption", searchTerm)]
    );
  } catch (error) {
    console.error("Error searching posts:", error);
    return null;
  }
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
  try {
    const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];
    if (pageParam) {
      queries.push(Query.cursorAfter(pageParam.toString()));
    }
    return await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );
  } catch (error) {
    console.error("Error fetching infinite posts:", error);
    return null;
  }
}

export async function getPostById(postId?: string) {
  if (!postId) throw new Error("Post ID is required.");

  try {
    return await database.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );
  } catch (error) {
    console.error("Error fetching post by ID:", error);
    return null;
  }
}

export async function updatePost(post: IUpdatePost) {
  try {
    let image = { imageUrl: post.imageUrl, imageId: post.imageId };

    if (post.file.length > 0) {
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw new Error("File upload failed.");

      const fileUrl = await getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw new Error("Failed to retrieve file preview.");
      }

      image = { imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    const tags = post.tags?.replace(/ /g, "").split(",").filter(Boolean) || [];

    const updatedPost = await database.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
        location: post.location,
        tags: tags,
      }
    );

    if (post.file.length > 0) {
      await deleteFile(post.imageId);
    }

    return updatedPost;
  } catch (error) {
    console.error("Error updating post:", error);
    throw error;
  }
}
export async function getRecentPosts() {
  try {
    const posts = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc('$createdAt'), Query.limit(20)]
    );

    console.log("Fetched posts:", posts); // Log the fetched posts

    if (!posts || !posts.documents) {
      throw new Error("No posts found");
    }

    return posts; // Ensure this returns the correct structure
  } catch (error) {
    console.error("Error fetching recent posts:", error);
    throw error; // Rethrow the error for handling in the component
  }
}


export async function deletePost(postId?: string, imageId?: string) {
  if (!postId || !imageId) return;

  try {
    const statusCode = await database.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!statusCode) throw Error;

    await deleteFile(imageId);

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== LIKE / UNLIKE POST
export async function likePost(postId: string, likesArray: string[]) {
  try {
    const updatedPost = await database.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        likes: likesArray,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SAVE POST
export async function savePost(userId: string, postId: string) {
  try {
    const updatedPost = await database.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.saveCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}
// ============================== DELETE SAVED POST
export async function deleteSavedPost(savedRecordId: string) {
  try {
    const statusCode = await database.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.saveCollectionId,
      savedRecordId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER'S POST
export async function getUserPosts(userId?: string) {
  if (!userId) return { total: 0, documents: [] };

  try {
    const post = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
    );

    if (!post) return { total: 0, documents: [] };

    return post;
  } catch (error) {
    console.log(error);
    return { total: 0, documents: [] };
  }
}

// ============================== GET POPULAR POSTS (BY HIGHEST LIKE COUNT)


// ============================================================
// USER
// ============================================================

// ============================== GET USERS
export async function getUsers(limit?: number) {
  const queries: any[] = [Query.orderDesc("$createdAt")];

  if (limit) {
    queries.push(Query.limit(limit));
  }

  try {
    const users = await database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      queries
    );

    if (!users) throw Error;

    return users;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER BY ID
export async function getUserById(userId: string) {
  try {
    const user = await database.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    if (!user) throw Error;

    return user;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE USER
export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  try {
    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = await getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    //  Update user
    const updatedUser = await database.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      {
        name: user.name,
        bio: user.bio,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
      }
    );

    // Failed to update
    if (!updatedUser) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }
      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    console.log(error);
  }
}