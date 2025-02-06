import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import GridPostList from "@/components/shared/GridPostList";
import PostStats from "@/components/shared/PostStats";
import { useGetPostById, useGetUserPosts, useDeletePost } from "@/lib/react-query/queryAndMutations";
import { multiFormatDateString } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";

const PostDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useUserContext();

  // Fetch post details
  const {
    data: post,
    isLoading: isPostLoading,
    isError: isPostError,
  } = useGetPostById(id || "");

  // Default values to ensure consistent hook usage
  const creatorId = id ? post?.creators?.$id : null;

  // Fetch user posts (even if creatorId is null, it will not execute the query)
  const {
    data: userPosts,
    isLoading: isUserPostLoading,
  } = useGetUserPosts(creatorId);

  const relatedPosts = userPosts?.documents.filter(
    (userPost) => userPost.$id !== id
  );

  const { mutate: deletePost } = useDeletePost();

  const handleDeletePost = () => {
    deletePost(
      { postId: id, imageId: post?.imageId },
      {
        onSuccess: () => {
          navigate(-1);
        },
        onError: (error) => {
          console.error("Failed to delete post:", error);
        },
      }
    );
  };

  // Handle loading and error states
  if (!id) {
    return (
      <div className="flex-center w-full h-full">
        <p className="text-red-500">Invalid post ID.</p>
      </div>
    );
  }

  if (isPostLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  if (isPostError || !post) {
    return (
      <div className="flex-center w-full h-full">
        <p className="text-red-500">Failed to load post.</p>
      </div>
    );
  }

  return (
    <div className="post_details-container">
      {/* Back Button */}
      <div className="hidden md:flex max-w-5xl w-full">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="shad-button_ghost"
        >
          <img
            src="/assets/icons/back.svg"
            alt="back"
            width={20}
            height={20}
          />
          Back
        </Button>
      </div>

      {/* Post Details */}
      <div className="post_details-card">
        <img
          src={post?.imageUrl}
          alt="post image"
          className="post_details-img"
        />

        <div className="post_details-info">
          {/* Post Creator */}
          <div className="flex-between w-full">
            <Link
              to={`/profile/${post.creators?.$id}`}
              className="flex items-center gap-3"
            >
              <img
                src={
                  post.creators?.imageUrl ||
                  "/assets/icons/profile-placeholder.svg"
                }
                alt="creator"
                className="w-8 h-8 lg:w-12 lg:h-12 rounded-full"
              />
              <div className="flex gap-1 flex-col">
                <p className="base-medium lg:body-bold text-light-1">
                  {post.creators?.name}
                </p>
                <div className="flex-center gap-2 text-light-3">
                  <p className="subtle-semibold lg:small-regular ">
                    {multiFormatDateString(post?.$createdAt)}
                  </p>
                  •
                  <p className="subtle-semibold lg:small-regular">
                    {post?.location}
                  </p>
                </div>
              </div>
            </Link>

            {/* Delete Button */}
            {user?.id === post.creators?.$id && (
              <Button
                onClick={handleDeletePost}
                variant="ghost"
                className="shad-button_ghost"
              >
                <img
                  src="/assets/icons/delete.svg"
                  alt="delete"
                  width={20}
                  height={20}
                />
                Delete
              </Button>
            )}
          </div>

          {/* Caption and Tags */}
          <div className="post_details-caption">
            <p>{post?.caption}</p>
          </div>
          <div className="post_details-tags">
            {post?.tags.map((tag: string, index: number) => (
              <span key={index} className="tag">
                #{tag}
              </span>
            ))}
          </div>

          <PostStats post={post} userId={user?.id} />
        </div>
      </div>

      {/* Related Posts */}
      <div className="related-posts">
        <h3 className="h3-bold text-light-1">Related Posts</h3>
        {isUserPostLoading ? (
          <Loader />
        ) : (
          <GridPostList posts={relatedPosts || []} />
        )}
      </div>
    </div>
  );
};

export default PostDetails;
