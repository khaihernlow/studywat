import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Drawer, DrawerContent, DrawerClose } from './ui/drawer';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { MoreVertical, X } from 'lucide-react';
import ReactDOM from 'react-dom';
import { programListsApi } from '../services/programLists';
import type { ProgramList } from '../services/programLists';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';

interface ListCardRowProps {
  userId: string;
  lists: any[];
  onAddList: (newListData: any) => Promise<void>;
  onEditList: (id: string, updateData: any) => Promise<void>;
  onDeleteList: (id: string) => Promise<void>;
  onListClick?: (list: any) => void;
  loading?: boolean;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

const MAX_DISPLAY_LENGTH = 20;
const MAX_INPUT_LENGTH = 50;

function truncateTitle(title: string, max: number) {
  return title.length > max ? title.slice(0, max - 1) + '…' : title;
}

// Helper component to render Twitter-style emoji as image
function EmojiImg({ emoji, size = 28 }: { emoji: string, size?: number }) {
  return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}>{emoji}</span>;
}

export default function ListCardRow({ userId, lists, onAddList, onEditList, onDeleteList, onListClick, loading }: ListCardRowProps) {
  const [open, setOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListEmoji, setNewListEmoji] = useState<string>('📋');
  const [EmojiPickerComponent, setEmojiPickerComponent] = useState<any>(null);
  const [emojiPickerLoading, setEmojiPickerLoading] = useState(false);
  const isMobile = useIsMobile();
  const [popoverOpenId, setPopoverOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const popoverRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [popoverStyle, setPopoverStyle] = useState<{ [key: string]: React.CSSProperties }>({});
  const [editListId, setEditListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState<string>('');
  const [editListEmoji, setEditListEmoji] = useState<string>('📋');
  const [editEmojiPickerComponent, setEditEmojiPickerComponent] = useState<any>(null);
  const [editEmojiPickerLoading, setEditEmojiPickerLoading] = useState(false);

  useEffect(() => {
    if (open) {
      import('emoji-picker-react').then(module => {
        setEmojiPickerComponent(() => module.default);
        setEmojiPickerLoading(false);
      });
    }
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setEmojiPickerComponent(null);
    setEmojiPickerLoading(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewListName('');
    setNewListEmoji('📋');
    setEmojiPickerComponent(null);
    setEmojiPickerLoading(false);
  };

  const handleCreate = async () => {
    if (newListName.trim()) {
      try {
        await onAddList({
          title: newListName.trim(),
          emoji: newListEmoji || '📋',
          user_id: userId,
        });
        handleClose();
        toast.success("List created successfully");
      } catch (error) {
        toast.error("Failed to create list. Please try again.");
      }
    }
  };

  const handleEdit = (list: ProgramList) => {
    setEditListId(list.id);
    setEditListName(list.title);
    setEditListEmoji(list.emoji || '📋');
    setPopoverOpenId(null);
    setEditEmojiPickerComponent(null);
    setEditEmojiPickerLoading(false);
  };

  const handleEditSave = async () => {
    if (editListId && editListName.trim()) {
      try {
        const updatePayload: any = {
          title: editListName.trim(),
          emoji: editListEmoji,
        };
        const listToEdit = lists.find(l => l.id === editListId);
        if (listToEdit && listToEdit.program_ids) {
          updatePayload.program_ids = listToEdit.program_ids;
        }
        await onEditList(editListId, updatePayload);
        setEditListId(null);
        setEditListName('');
        setEditListEmoji('📋');
        toast.success("List updated successfully");
      } catch (error: any) {
        toast.error("Failed to update list. Please try again.");
      }
    }
  };

  const handleDelete = async (listId: string) => {
    try {
      await onDeleteList(listId);
      setConfirmDeleteId(null);
      setPopoverOpenId(null);
      toast.success("List deleted successfully");
    } catch (error) {
      toast.error("Failed to delete list. Please try again.");
    }
  };

  // Popover positioning and outside click logic (desktop)
  useEffect(() => {
    if (!popoverOpenId || isMobile) return;
    if (typeof popoverOpenId !== 'string') return;
    function handleClick(e: MouseEvent) {
      if (typeof popoverOpenId !== 'string') return;
      const popoverRef = popoverRefs.current[popoverOpenId];
      const buttonRef = buttonRefs.current[popoverOpenId];
      if (
        popoverRef &&
        !popoverRef.contains(e.target as Node) &&
        buttonRef &&
        !buttonRef.contains(e.target as Node)
      ) {
        setPopoverOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popoverOpenId, isMobile]);

  useEffect(() => {
    if (!popoverOpenId || isMobile) return;
    if (typeof popoverOpenId !== 'string') return;
    const button = buttonRefs.current[popoverOpenId];
    const popover = popoverRefs.current[popoverOpenId];
    if (button && popover) {
      const rect = button.getBoundingClientRect();
      setPopoverStyle(prev => ({
        ...prev,
        [popoverOpenId]: {
          position: 'absolute',
          left: rect.right - 120, // 120px width
          top: rect.top + 24 + window.scrollY, // below the button
          zIndex: 9999,
          width: 120,
        },
      }));
    }
  }, [popoverOpenId, isMobile]);

  // Lazy load emoji picker for edit only when modal is open
  useEffect(() => {
    if (editListId && !editEmojiPickerComponent && !editEmojiPickerLoading) {
      setEditEmojiPickerLoading(true);
      import('emoji-picker-react').then(module => {
        setEditEmojiPickerComponent(() => module.default);
        setEditEmojiPickerLoading(false);
      });
    }
  }, [editListId, editEmojiPickerComponent, editEmojiPickerLoading]);

  const handleEditClose = () => {
    setEditListId(null);
    setEditListName('');
    setEditListEmoji('📋');
  };

  return (
    <>
      {/* Only one style tag for hide-scrollbar, outside of any map */}
      {isMobile && (
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      )}
      <div
        className={
          isMobile
            ? 'mb-8 overflow-x-auto'
            : 'mb-8 flex flex-row flex-wrap gap-2 items-center'
        }
        style={
          isMobile
            ? {
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE 10+
              }
            : undefined
        }
      >
        <div
          className={
            isMobile
              ? 'flex flex-row gap-4 min-w-fit w-max p-1 hide-scrollbar'
              : 'flex flex-row flex-wrap gap-2 items-center'
          }
        >
          <div
            className={
              isMobile
                ? 'flex flex-row gap-4 min-w-fit w-max p-1 hide-scrollbar'
                : 'flex flex-row flex-wrap gap-2 items-center'
            }
          >
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="w-32 h-32 p-2 rounded-lg flex flex-col items-center justify-center text-lg text-center font-semibold border border-muted relative">
                    <Skeleton className="w-12 h-12 mb-2 rounded-full" />
                    <Skeleton className="h-4 w-20 mb-1 rounded" />
                  </Card>
                ))
              : lists.map(list => {
                  const popoverContent = (
                    <div
                      key={list.id + '-popover'}
                      ref={el => { popoverRefs.current[list.id] = el; }}
                      className="rounded-md border bg-popover shadow-lg z-50 flex flex-col gap-1"
                      style={popoverOpenId === list.id ? popoverStyle[list.id] : {}}
                    >
                      <button className="text-left px-2 py-1 hover:bg-accent rounded-t-md cursor-pointer" type="button" onClick={() => handleEdit(list)}>Edit</button>
                      <button className="text-left px-2 py-1 hover:bg-accent rounded-b-md text-destructive cursor-pointer" type="button" onClick={() => { setPopoverOpenId(null); setConfirmDeleteId(list.id); }}>Delete</button>
                    </div>
                  );
                  return (
                    <div key={list.id}>
                      <Card
                        className="w-32 h-32 p-2 rounded-lg flex flex-col items-center justify-center text-lg text-center font-semibold select-none hover:bg-accent transition border border-muted relative"
                        onClick={e => {
                          // Prevent click if clicking the edit/delete button
                          if ((e.target as HTMLElement).closest('button')) return;
                          if (onListClick) onListClick(list);
                        }}
                      >
                        <button
                          type="button"
                          className="absolute top-2 right-1 rounded-full hover:bg-accent focus:outline-none cursor-pointer"
                          tabIndex={-1}
                          ref={el => { buttonRefs.current[list.id] = el; }}
                          onClick={() => setPopoverOpenId(popoverOpenId === list.id ? null : list.id)}
                        >
                          <MoreVertical className="w-5 h-5 text-muted-foreground" />
                        </button>
                        {!isMobile && popoverOpenId === list.id && typeof window !== 'undefined' && ReactDOM.createPortal(
                          popoverContent,
                          document.body
                        )}
                        {isMobile && (
                          <Drawer open={popoverOpenId === list.id} onOpenChange={open => setPopoverOpenId(open ? list.id : null)}>
                            <DrawerContent>
                              <div className="flex justify-between items-center p-4 pb-2">
                                <span className="font-semibold text-lg">List Options</span>
                                <DrawerClose asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" aria-label="Close">
                                    <X className="h-5 w-5" />
                                  </Button>
                                </DrawerClose>
                              </div>
                              <div className="p-4 flex flex-col gap-1">
                                <button className="text-left px-2 py-2 hover:bg-accent rounded-t-md cursor-pointer" type="button" onClick={() => handleEdit(list)}>Edit</button>
                                <button className="text-left px-2 py-2 hover:bg-accent rounded-b-md text-destructive cursor-pointer" type="button" onClick={() => { setPopoverOpenId(null); setConfirmDeleteId(list.id); }}>Delete</button>
                              </div>
                            </DrawerContent>
                          </Drawer>
                        )}
                        <EmojiImg emoji={list.emoji || '📋'} size={28} />
                        <span className='text-base'>{truncateTitle(list.title, MAX_DISPLAY_LENGTH)}</span>
                      </Card>
                      <Dialog open={confirmDeleteId === list.id} onOpenChange={open => setConfirmDeleteId(open ? list.id : null)}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete List</DialogTitle>
                          </DialogHeader>
                          <div>Are you sure you want to delete <b>{list.title}</b>?</div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="cursor-pointer">Cancel</Button>
                            <Button variant="destructive" onClick={() => handleDelete(list.id)} className="cursor-pointer">Delete</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {/* Edit Modal/Drawer (shared for both desktop and mobile) */}
                      {(editListId === list.id) && (
                        isMobile ? (
                          <Drawer open={true} onOpenChange={open => { if (!open) handleEditClose(); }}>
                            <DrawerContent>
                              <div className="flex justify-between items-center p-4 pb-2">
                                <span className="font-semibold text-lg">Edit List</span>
                                <DrawerClose asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" aria-label="Close">
                                    <X className="h-5 w-5" />
                                  </Button>
                                </DrawerClose>
                              </div>
                              <div className="p-4 flex flex-col gap-4">
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-4xl cursor-pointer">{editListEmoji}</span>
                                  {editEmojiPickerLoading && <div className="py-8">Loading emoji picker...</div>}
                                  {editEmojiPickerComponent && (
                                    React.createElement(editEmojiPickerComponent, {
                                      onEmojiClick: (emojiData: any) => setEditListEmoji(emojiData.emoji),
                                      height: 350,
                                      width: 300,
                                      lazyLoadEmojis: true,
                                      searchDisabled: false,
                                      previewConfig: { showPreview: false },
                                    })
                                  )}
                                </div>
                                <Input
                                  placeholder="List name"
                                  value={editListName}
                                  onChange={e => setEditListName(e.target.value)}
                                  className="w-full"
                                  autoFocus
                                  maxLength={MAX_INPUT_LENGTH}
                                />
                                <div className="flex gap-2 justify-end">
                                  <DrawerClose asChild>
                                    <Button variant="outline" type="button" onClick={handleEditClose} className="cursor-pointer">Cancel</Button>
                                  </DrawerClose>
                                  <Button type="button" onClick={handleEditSave} disabled={!editListName.trim()} className="cursor-pointer">Save</Button>
                                </div>
                              </div>
                            </DrawerContent>
                          </Drawer>
                        ) : (
                          <Dialog open={true} onOpenChange={open => { if (!open) handleEditClose(); }}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit List</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col items-center gap-2 mb-2">
                                <span className="text-4xl cursor-pointer">{editListEmoji}</span>
                                {editEmojiPickerLoading && <div className="py-8">Loading emoji picker...</div>}
                                {editEmojiPickerComponent && (
                                  React.createElement(editEmojiPickerComponent, {
                                    onEmojiClick: (emojiData: any) => setEditListEmoji(emojiData.emoji),
                                    height: 350,
                                    width: 300,
                                    lazyLoadEmojis: true,
                                    searchDisabled: false,
                                    previewConfig: { showPreview: false },
                                  })
                                )}
                              </div>
                              <Input
                                placeholder="List name"
                                value={editListName}
                                onChange={e => setEditListName(e.target.value)}
                                className="w-full"
                                autoFocus
                                maxLength={MAX_INPUT_LENGTH}
                              />
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline" type="button" onClick={handleEditClose} className="cursor-pointer">Cancel</Button>
                                </DialogClose>
                                <Button type="button" onClick={handleEditSave} disabled={!editListName.trim()} className="cursor-pointer">Save</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )
                      )}
                    </div>
                  );
                })}
            <button
              type="button"
              className="w-32 h-32 rounded-lg border-2 border-dashed border-muted flex flex-col items-center justify-center text-muted-foreground hover:bg-accent transition cursor-pointer"
              onClick={handleOpen}
            >
              <span className="text-3xl mb-1">+</span>
              <span className="text-xs">Add New List</span>
            </button>
          </div>
        </div>
      </div>
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <div className="flex justify-between items-center p-4 pb-2">
              <span className="font-semibold text-lg">Create New List</span>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" aria-label="Close">
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl cursor-pointer">{newListEmoji}</span>
                {emojiPickerLoading && <div className="py-8">Loading emoji picker...</div>}
                {EmojiPickerComponent && (
                  <EmojiPickerComponent
                    onEmojiClick={(emojiData: any) => setNewListEmoji(emojiData.emoji)}
                    height={350}
                    width={300}
                    lazyLoadEmojis
                    searchDisabled={false}
                    previewConfig={{showPreview: false}}
                  />
                )}
              </div>
              <Input
                placeholder="List name"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                className="w-full"
                autoFocus
                maxLength={MAX_INPUT_LENGTH}
              />
              <div className="flex gap-2 justify-end">
                <DrawerClose asChild>
                  <Button variant="outline" type="button" onClick={handleClose} className="cursor-pointer">Cancel</Button>
                </DrawerClose>
                <Button type="button" onClick={handleCreate} disabled={!newListName.trim()} className="cursor-pointer">Create</Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New List</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-2 mb-2">
              <span className="text-4xl cursor-pointer">{newListEmoji}</span>
              {emojiPickerLoading && <div className="py-8">Loading emoji picker...</div>}
              {EmojiPickerComponent && (
                <EmojiPickerComponent
                  onEmojiClick={(emojiData: any) => setNewListEmoji(emojiData.emoji)}
                  height={350}
                  width={300}
                  lazyLoadEmojis
                  searchDisabled={false}
                  previewConfig={{showPreview: false}}
                />
              )}
            </div>
            <Input
              placeholder="List name"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              className="w-full"
              autoFocus
              maxLength={MAX_INPUT_LENGTH}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" onClick={handleClose} className="cursor-pointer">Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleCreate} disabled={!newListName.trim()} className="cursor-pointer">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 