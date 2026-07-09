"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createComment,
  deleteComment,
  getFileComments,
  updateComment,
} from "@/lib/actions/comment.actions";

type CommentAuthor = {
  id: string;
  name: string;
  avatar?: string;
};

type CommentItem = {
  $id: string;
  body: string;
  createdAt?: string;
  authorId: string;
  author?: CommentAuthor;
};

type CommentPanelProps = {
  fileId: string;
};

const MENTION_REGEX = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

const extractMentions = (body: string) => {
  const mentions = new Set<string>();
  for (const match of body.matchAll(MENTION_REGEX)) {
    if (match[1]) mentions.add(match[1].toLowerCase());
  }
  return Array.from(mentions);
};

const CommentPanel = ({ fileId }: CommentPanelProps) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const loadComments = useCallback(async () => {
    try {
      const result = await getFileComments(fileId);
      setComments((result?.comments as unknown as CommentItem[]) || []);
    } catch {
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    void loadComments();
    const interval = setInterval(() => {
      void loadComments();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadComments]);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await createComment(fileId, trimmed, extractMentions(trimmed));
      setBody("");
      await loadComments();
      toast.success("Comment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    const trimmed = editBody.trim();
    if (!trimmed) return;

    try {
      await updateComment(commentId, trimmed);
      setEditingId(null);
      setEditBody("");
      await loadComments();
      toast.success("Comment updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update comment");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      await loadComments();
      toast.success("Comment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  return (
    <div className="flex h-full flex-col border-t border-light-200 bg-white">
      <div className="border-b border-light-200 px-4 py-3">
        <p className="text-sm font-medium text-light-100">Comments</p>
        <p className="caption text-light-200">Use @email to mention someone</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <p className="caption text-light-200">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="caption text-light-200">No comments yet. Start the conversation.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.$id} className="rounded-xl bg-light-400 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-light-100">
                    {comment.author?.name || "User"}
                  </p>
                  <FormattedDateTime
                    isoString={comment.createdAt}
                    className="caption text-light-200"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="caption text-brand hover:underline"
                    onClick={() => {
                      setEditingId(comment.$id);
                      setEditBody(comment.body);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="caption text-red hover:underline"
                    onClick={() => handleDelete(comment.$id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingId === comment.$id ? (
                <div className="mt-2 space-y-2">
                  <Input
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    className="shad-input"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => handleUpdate(comment.$id)}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="body-2 mt-2 whitespace-pre-wrap text-light-100">{comment.body}</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-light-200 p-4">
        <div className="flex gap-2">
          <Input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a comment..."
            className="shad-input"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !body.trim()}>
            {isSubmitting ? "..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentPanel;
